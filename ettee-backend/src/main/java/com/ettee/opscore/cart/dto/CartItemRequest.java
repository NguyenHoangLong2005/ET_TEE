package com.ettee.opscore.cart.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CartItemRequest(@NotNull UUID variantId, @Min(0) int quantity) {
}