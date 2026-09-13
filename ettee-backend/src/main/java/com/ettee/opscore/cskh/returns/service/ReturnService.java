package com.ettee.opscore.cskh.returns.service;

import com.ettee.opscore.cskh.returns.dto.*;
import com.ettee.opscore.cskh.returns.entity.ReturnRequest;
import com.ettee.opscore.cskh.returns.entity.ReturnStatus;
import com.ettee.opscore.cskh.returns.repository.ReturnRequestRepository;
import com.ettee.opscore.common.dto.PageResponse;
import com.ettee.opscore.common.exception.AppExceptions;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReturnService {

    private final ReturnRequestRepository returnRequestRepository;

    private static final Set<ReturnStatus> TERMINAL = Set.of(
            ReturnStatus.rejected, ReturnStatus.completed, ReturnStatus.refunded, ReturnStatus.cancelled
    );

    @Transactional(readOnly = true)
    public PageResponse<ReturnRequestDto> search(ReturnStatus status, Pageable pageable) {
        var page = status == null
                ? returnRequestRepository.findAllByOrderByCreatedAtDesc(pageable)
                : returnRequestRepository.findAllByStatusOrderByCreatedAtDesc(status, pageable);
        return PageResponse.from(page.map(this::toDto));
    }

    @Transactional
    public ReturnRequestDto create(CreateReturnRequestDto dto, UUID actorId) {
        ReturnRequest r = new ReturnRequest();
        r.setOrderId(dto.orderId());
        r.setRequestedBy(actorId);
        r.setRequestType(dto.requestType() == null ? "return_refund" : dto.requestType());
        r.setReason(dto.reason());
        r.setStatus(ReturnStatus.requested);
        return toDto(returnRequestRepository.save(r));
    }

    /**
     * "Tiếp nhận yêu cầu hủy/đổi trả" — CSKH chuyển trạng thái theo luồng:
     * requested -> approved -> item_received -> (exchange_sent | completed/refunded)
     * Dùng optimistic lock (version) để tránh 2 nhân viên xử lý trùng cùng lúc.
     */
    @Transactional
    public ReturnRequestDto handle(UUID id, HandleReturnRequestDto dto, UUID actorId) {
        ReturnRequest r = findOrThrow(id);
        if (TERMINAL.contains(r.getStatus())) {
            throw new AppExceptions.BusinessRuleViolationException("Yêu cầu đã ở trạng thái cuối (" + r.getStatus() + "), không thể xử lý tiếp");
        }
        if ("return_refund".equals(r.getRequestType()) && dto.newStatus() == ReturnStatus.exchange_sent) {
            throw new AppExceptions.BusinessRuleViolationException("Yêu cầu hoàn tiền không thể chuyển sang trạng thái 'đã gửi hàng đổi'");
        }
        if (dto.replacementOrderId() != null) {
            if (!"exchange".equals(r.getRequestType())) {
                throw new AppExceptions.BusinessRuleViolationException("Chỉ yêu cầu 'exchange' mới được gắn đơn hàng thay thế");
            }
            if (dto.replacementOrderId().equals(r.getOrderId())) {
                throw new AppExceptions.BusinessRuleViolationException("Đơn hàng thay thế không được trùng đơn gốc");
            }
            r.setReplacementOrderId(dto.replacementOrderId());
        }

        r.setStatus(dto.newStatus());
        r.setHandledBy(actorId);
        if (TERMINAL.contains(dto.newStatus())) {
            r.setResolvedAt(Instant.now());
        }

        try {
            return toDto(returnRequestRepository.save(r));
        } catch (OptimisticLockingFailureException e) {
            throw new AppExceptions.StaleDataException("Yêu cầu này vừa được cập nhật bởi người khác, vui lòng tải lại");
        }
    }

    private ReturnRequest findOrThrow(UUID id) {
        return returnRequestRepository.findById(id)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Yêu cầu đổi/trả", id));
    }

    private ReturnRequestDto toDto(ReturnRequest r) {
        return new ReturnRequestDto(r.getId(), r.getOrderId(), r.getRequestedBy(), r.getRequestType(), r.getReason(),
                r.getStatus(), r.getHandledBy(), r.getReplacementOrderId(), r.getCreatedAt(), r.getResolvedAt());
    }
}
