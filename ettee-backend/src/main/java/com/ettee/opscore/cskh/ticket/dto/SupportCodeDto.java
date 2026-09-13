package com.ettee.opscore.cskh.ticket.dto;

import com.ettee.opscore.storeowner.inventory.entity.ApprovalStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SupportCodeDto(
        UUID id, UUID ticketId, UUID promotionId, String promotionCode, UUID customerId,
        BigDecimal value, UUID issuedBy, ApprovalStatus approvalStatus, UUID approvedBy,
        Instant issuedAt, Instant expiresAt
) {
}
