package com.ettee.opscore.storeowner.product.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CreateVariantRequest(
        @NotBlank(message = "SKU không được để trống") String sku,
        @NotNull @DecimalMin(value = "0", message = "Giá phải >= 0") BigDecimal price,
        BigDecimal compareAtPrice,
        Integer weightGrams,
        String barcode,
        String attributeSignature
) {
}
