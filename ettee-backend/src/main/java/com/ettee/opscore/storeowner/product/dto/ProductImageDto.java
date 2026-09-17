package com.ettee.opscore.storeowner.product.dto;

import java.util.UUID;

public record ProductImageDto(UUID id, UUID variantId, String url, String altText, boolean primary, int sortOrder) {
}