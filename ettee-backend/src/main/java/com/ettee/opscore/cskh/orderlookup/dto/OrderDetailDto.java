package com.ettee.opscore.cskh.orderlookup.dto;

import com.ettee.opscore.order.entity.OrderStatus;
import com.ettee.opscore.order.entity.PaymentMethod;
import com.ettee.opscore.order.entity.PaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record OrderDetailDto(
        UUID id, String orderCode, UUID customerId, String customerName, String customerPhone,
        String customerEmail, Map<String, Object> shippingAddress,
        OrderStatus status, PaymentMethod paymentMethod, PaymentStatus paymentStatus,
        BigDecimal subtotal, BigDecimal discountTotal, BigDecimal shippingFee, BigDecimal shippingDiscount,
        BigDecimal total, Instant placedAt, Instant confirmedAt, Instant cancelledAt, String cancelledReason,
        List<OrderItemDto> items
) {
}
