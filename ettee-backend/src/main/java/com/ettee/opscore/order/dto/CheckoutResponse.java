package com.ettee.opscore.order.dto;

import java.util.UUID;

public record CheckoutResponse(
        UUID orderId,
        String orderCode,
        String message) {
}
