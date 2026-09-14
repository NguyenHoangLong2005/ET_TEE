package com.ettee.opscore.order.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CheckoutItemsRequest(
        @NotNull(message = "Thiếu biến thể sản phẩm") UUID variantId,
        @Min(value = 1, message = "Số lượng phải lớn hơn 0") int quantity) {
}
