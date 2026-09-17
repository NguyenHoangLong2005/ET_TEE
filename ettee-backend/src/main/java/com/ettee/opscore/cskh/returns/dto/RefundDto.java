package com.ettee.opscore.cskh.returns.dto;

import com.ettee.opscore.order.entity.PaymentMethod;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record RefundDto(
        UUID id, UUID returnRequestId, UUID orderId, UUID paymentId, BigDecimal amount,
        PaymentMethod method, String status, String providerRef, UUID processedBy, Instant processedAt
) {
}
