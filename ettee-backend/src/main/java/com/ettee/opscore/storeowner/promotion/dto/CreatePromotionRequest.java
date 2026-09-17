package com.ettee.opscore.storeowner.promotion.dto;

import com.ettee.opscore.storeowner.promotion.entity.DiscountType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;

public record CreatePromotionRequest(
        @NotBlank String code,
        @NotBlank String name,
        String description,
        @NotNull DiscountType discountType,
        @NotNull @DecimalMin("0") BigDecimal discountValue,
        BigDecimal maxDiscountAmount,
        BigDecimal minOrderValue,
        @NotNull Instant startAt,
        @NotNull Instant endAt
) {
}
