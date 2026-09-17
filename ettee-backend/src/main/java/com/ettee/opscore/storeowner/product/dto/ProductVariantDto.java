package com.ettee.opscore.storeowner.product.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ProductVariantDto(
        UUID id, String sku, BigDecimal price, BigDecimal compareAtPrice,
        Integer weightGrams, String barcode, boolean active, String attributeSignature
) {
}
