package com.ettee.opscore.storeowner.inventory.dto;

import com.ettee.opscore.storeowner.inventory.entity.ApprovalStatus;

import java.time.Instant;
import java.util.UUID;

public record StockAdjustmentRequestDto(
        UUID id, UUID variantId, UUID locationId, UUID requestedBy, int quantityDiff,
        String reason, ApprovalStatus status, UUID approvedBy, Instant approvedAt, Instant createdAt
) {
}
