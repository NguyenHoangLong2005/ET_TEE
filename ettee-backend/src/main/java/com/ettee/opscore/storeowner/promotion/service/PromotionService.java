package com.ettee.opscore.storeowner.promotion.service;

import com.ettee.opscore.common.dto.PageResponse;
import com.ettee.opscore.common.exception.AppExceptions;
import com.ettee.opscore.storeowner.promotion.dto.CreatePromotionRequest;
import com.ettee.opscore.storeowner.promotion.dto.PromotionDto;
import com.ettee.opscore.storeowner.promotion.entity.DiscountType;
import com.ettee.opscore.storeowner.promotion.entity.Promotion;
import com.ettee.opscore.storeowner.promotion.entity.PromotionStatus;
import com.ettee.opscore.storeowner.promotion.repository.PromotionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PromotionService {

    private final PromotionRepository promotionRepository;

    @Transactional(readOnly = true)
    public PageResponse<PromotionDto> list(PromotionStatus status, Pageable pageable) {
        var page = status == null
                ? promotionRepository.findAllByOrderByStartAtDesc(pageable)
                : promotionRepository.findAllByStatusOrderByStartAtDesc(status, pageable);
        return PageResponse.from(page.map(this::toDto));
    }

    @Transactional
    public PromotionDto create(CreatePromotionRequest request, UUID actorId) {
        if (promotionRepository.existsByCode(request.code())) {
            throw new AppExceptions.BusinessRuleViolationException("Mã khuyến mãi đã tồn tại: " + request.code());
        }
        if (!request.endAt().isAfter(request.startAt())) {
            throw new AppExceptions.BusinessRuleViolationException("Ngày kết thúc phải sau ngày bắt đầu");
        }
        if (request.discountType() == DiscountType.percentage && request.discountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new AppExceptions.BusinessRuleViolationException("Giảm giá theo % không được vượt quá 100%");
        }

        Promotion p = new Promotion();
        p.setCode(request.code());
        p.setName(request.name());
        p.setDescription(request.description());
        p.setDiscountType(request.discountType());
        p.setDiscountValue(request.discountValue());
        p.setMaxDiscountAmount(request.maxDiscountAmount());
        if (request.minOrderValue() != null) p.setMinOrderValue(request.minOrderValue());
        p.setStartAt(request.startAt());
        p.setEndAt(request.endAt());
        p.setStatus(PromotionStatus.pending_approval);
        p.setCreatedBy(actorId);
        return toDto(promotionRepository.save(p));
    }

    @Transactional
    public PromotionDto approve(UUID id, UUID approverId) {
        Promotion p = findOrThrow(id);
        if (p.getStatus() != PromotionStatus.pending_approval) {
            throw new AppExceptions.BusinessRuleViolationException("Chỉ duyệt được khuyến mãi đang ở trạng thái chờ phê duyệt");
        }
        p.setStatus(PromotionStatus.active);
        p.setApprovedBy(approverId);
        p.setApprovedAt(Instant.now());
        return toDto(promotionRepository.save(p));
    }

    @Transactional
    public PromotionDto reject(UUID id, UUID approverId, String reason) {
        Promotion p = findOrThrow(id);
        if (p.getStatus() != PromotionStatus.pending_approval) {
            throw new AppExceptions.BusinessRuleViolationException("Chỉ từ chối được khuyến mãi đang ở trạng thái chờ phê duyệt");
        }
        p.setStatus(PromotionStatus.rejected);
        p.setApprovedBy(approverId);
        p.setApprovedAt(Instant.now());
        p.setDescription((p.getDescription() == null ? "" : p.getDescription() + " | ") + "Từ chối: " + reason);
        return toDto(promotionRepository.save(p));
    }

    private Promotion findOrThrow(UUID id) {
        return promotionRepository.findById(id)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Khuyến mãi", id));
    }

    private PromotionDto toDto(Promotion p) {
        return new PromotionDto(p.getId(), p.getCode(), p.getName(), p.getDescription(), p.getDiscountType(),
                p.getDiscountValue(), p.getMaxDiscountAmount(), p.getMinOrderValue(), p.getStartAt(), p.getEndAt(),
                p.getStatus(), p.getApprovedBy(), p.getApprovedAt());
    }
}
