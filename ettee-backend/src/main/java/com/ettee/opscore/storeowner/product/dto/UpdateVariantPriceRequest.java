package com.ettee.opscore.storeowner.product.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/** Nghiệp vụ "set giá" — sửa giá bán / giá so sánh (giá gạch) của 1 variant. */
public record UpdateVariantPriceRequest(
        @NotNull @DecimalMin(value = "0", message = "Giá phải >= 0") BigDecimal price,
        BigDecimal compareAtPrice
) {
}
