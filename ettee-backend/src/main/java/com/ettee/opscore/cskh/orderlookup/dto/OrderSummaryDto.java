package com.ettee.opscore.cskh.orderlookup.dto;

import com.ettee.opscore.order.entity.OrderStatus;
import com.ettee.opscore.order.entity.PaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record OrderSummaryDto(
        UUID id, String orderCode, String customerName, String customerPhone,
        OrderStatus status, PaymentStatus paymentStatus, BigDecimal total, Instant placedAt
) {
}
