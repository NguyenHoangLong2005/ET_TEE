package com.ettee.opscore.cskh.returns.dto;

import com.ettee.opscore.cskh.returns.entity.ReturnStatus;

import java.time.Instant;
import java.util.UUID;

public record ReturnRequestDto(
        UUID id, UUID orderId, UUID requestedBy, String requestType, String reason,
        ReturnStatus status, UUID handledBy, UUID replacementOrderId, Instant createdAt, Instant resolvedAt
) {
}
