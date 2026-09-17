package com.ettee.opscore.storeowner.product.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateProductReviewRequest(
        @NotNull UUID orderItemId,
        @Min(1) @Max(5) short rating,
        String comment) {
}