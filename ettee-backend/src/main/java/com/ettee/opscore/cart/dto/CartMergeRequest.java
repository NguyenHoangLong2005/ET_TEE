package com.ettee.opscore.cart.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CartMergeRequest(@NotNull List<@Valid CartItemRequest> items) {
}