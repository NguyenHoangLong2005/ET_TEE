package com.ettee.opscore.storeowner.inventory.service;

import com.ettee.opscore.common.dto.PageResponse;
import com.ettee.opscore.common.exception.AppExceptions;
import com.ettee.opscore.storeowner.inventory.dto.*;
import com.ettee.opscore.storeowner.inventory.entity.*;
import com.ettee.opscore.storeowner.inventory.repository.InventoryRepository;
import com.ettee.opscore.storeowner.inventory.repository.StockAdjustmentRequestRepository;
import com.ettee.opscore.storeowner.inventory.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final StockMovementRepository movementRepository;
    private final StockAdjustmentRequestRepository requestRepository;

    @Transactional(readOnly = true)
    public PageResponse<InventoryDto> lowStock(Pageable pageable) {
        return PageResponse.from(inventoryRepository.findLowStock(pageable).map(this::toDto));
    }

    /**
     * Áp dụng thay đổi tồn kho: khóa dòng inventory (FOR UPDATE), cộng/trừ delta, ghi 1
     * stock_movement bất biến trong CÙNG transaction. Đây là điểm DUY NHẤT được phép sửa
     * inventory.quantity_on_hand/reserved trong toàn hệ thống — mọi nghiệp vụ khác (nhập kho,
     * xuất kho, giữ hàng, điều chỉnh...) đều phải gọi qua đây để đảm bảo nhất quán + có audit trail.
     */
    @Transactional
    public StockMovement applyMovement(UUID variantId, UUID locationId, MovementType type,
                                        int onHandDelta, int reservedDelta,
                                        String referenceType, UUID referenceId,
                                        UUID actorId, String note) {
        if (onHandDelta == 0 && reservedDelta == 0) {
            throw new AppExceptions.BusinessRuleViolationException("Delta tồn kho phải khác 0");
        }

        Inventory inv = inventoryRepository.lockByVariantAndLocation(variantId, locationId)
                .orElseGet(() -> {
                    Inventory created = new Inventory();
                    created.setId(new InventoryId(variantId, locationId));
                    return created;
                });

        int newOnHand = inv.getQuantityOnHand() + onHandDelta;
        int newReserved = inv.getQuantityReserved() + reservedDelta;
        if (newOnHand < 0) {
            throw new AppExceptions.BusinessRuleViolationException("Tồn kho không thể âm (on_hand hiện tại: " + inv.getQuantityOnHand() + ")");
        }
        if (newReserved < 0 || newReserved > newOnHand) {
            throw new AppExceptions.BusinessRuleViolationException("Số lượng giữ hàng (reserved) không hợp lệ so với tồn thực tế");
        }
        inv.setQuantityOnHand(newOnHand);
        inv.setQuantityReserved(newReserved);
        inventoryRepository.save(inv);

        StockMovement movement = new StockMovement();
        movement.setVariantId(variantId);
        movement.setLocationId(locationId);
        movement.setMovementType(type);
        movement.setOnHandDelta(onHandDelta);
        movement.setReservedDelta(reservedDelta);
        movement.setReferenceType(referenceType);
        movement.setReferenceId(referenceId);
        movement.setCreatedBy(actorId);
        movement.setNote(note);
        return movementRepository.save(movement);
    }

    @Transactional
    public StockAdjustmentRequestDto createAdjustmentRequest(CreateAdjustmentRequestDto dto, UUID actorId) {
        StockAdjustmentRequest req = new StockAdjustmentRequest();
        req.setVariantId(dto.variantId());
        req.setLocationId(dto.locationId());
        req.setRequestedBy(actorId);
        req.setQuantityDiff(dto.quantityDiff());
        req.setReason(dto.reason());
        req.setStatus(ApprovalStatus.pending);
        return toDto(requestRepository.save(req));
    }

    @Transactional(readOnly = true)
    public PageResponse<StockAdjustmentRequestDto> listRequests(ApprovalStatus status, Pageable pageable) {
        var page = status == null
                ? requestRepository.findAllByOrderByCreatedAtDesc(pageable)
                : requestRepository.findAllByStatusOrderByCreatedAtDesc(status, pageable);
        return PageResponse.from(page.map(this::toDto));
    }

    /**
     * Phê duyệt đề xuất điều chỉnh tồn kho.
     * Ràng buộc theo đúng CHECK của schema: người duyệt PHẢI khác người đề xuất.
     */
    @Transactional
    public StockAdjustmentRequestDto approve(UUID requestId, UUID approverId) {
        StockAdjustmentRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Yêu cầu điều chỉnh tồn kho", requestId));

        if (req.getStatus() != ApprovalStatus.pending) {
            throw new AppExceptions.BusinessRuleViolationException("Yêu cầu đã được xử lý trước đó");
        }
        if (req.getRequestedBy().equals(approverId)) {
            throw new AppExceptions.BusinessRuleViolationException("Không thể tự phê duyệt yêu cầu của chính mình");
        }

        StockMovement movement = applyMovement(
                req.getVariantId(), req.getLocationId(), MovementType.adjustment,
                req.getQuantityDiff(), 0, "stock_adjustment_requests", req.getId(),
                approverId, "Duyệt điều chỉnh: " + req.getReason()
        );

        req.setStatus(ApprovalStatus.approved);
        req.setApprovedBy(approverId);
        req.setApprovedAt(Instant.now());
        req.setAppliedMovementId(movement.getId());
        return toDto(requestRepository.save(req));
    }

    @Transactional
    public StockAdjustmentRequestDto reject(UUID requestId, UUID approverId, String reason) {
        StockAdjustmentRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Yêu cầu điều chỉnh tồn kho", requestId));
        if (req.getStatus() != ApprovalStatus.pending) {
            throw new AppExceptions.BusinessRuleViolationException("Yêu cầu đã được xử lý trước đó");
        }
        if (req.getRequestedBy().equals(approverId)) {
            throw new AppExceptions.BusinessRuleViolationException("Không thể tự từ chối yêu cầu của chính mình");
        }
        req.setStatus(ApprovalStatus.rejected);
        req.setApprovedBy(approverId);
        req.setApprovedAt(Instant.now());
        req.setReason(req.getReason() + " | Lý do từ chối: " + reason);
        return toDto(requestRepository.save(req));
    }

    private InventoryDto toDto(Inventory i) {
        return new InventoryDto(i.getId().getVariantId(), i.getId().getLocationId(),
                i.getQuantityOnHand(), i.getQuantityReserved(), i.getAvailable(), i.getReorderLevel());
    }

    private StockAdjustmentRequestDto toDto(StockAdjustmentRequest r) {
        return new StockAdjustmentRequestDto(r.getId(), r.getVariantId(), r.getLocationId(), r.getRequestedBy(),
                r.getQuantityDiff(), r.getReason(), r.getStatus(), r.getApprovedBy(), r.getApprovedAt(), r.getCreatedAt());
    }
}
