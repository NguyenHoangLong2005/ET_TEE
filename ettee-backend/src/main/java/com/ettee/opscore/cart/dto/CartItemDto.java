package com.ettee.opscore.cart.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record CartItemDto(UUID id, UUID variantId, int quantity, BigDecimal priceAtAdd) {
}