package com.ettee.opscore.storeowner.product.dto;

import com.ettee.opscore.storeowner.product.entity.GenderType;
import com.ettee.opscore.storeowner.product.entity.ProductStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ProductDto(
                UUID id, UUID categoryId, String name, String slug, String description, String brand,
                GenderType genderTarget, BigDecimal basePrice, ProductStatus status, boolean repeatPurchase,
                List<ProductVariantDto> variants, List<ProductImageDto> images, Instant createdAt, Instant updatedAt) {
}
