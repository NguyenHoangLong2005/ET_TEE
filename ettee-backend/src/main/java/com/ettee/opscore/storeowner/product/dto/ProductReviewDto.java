package com.ettee.opscore.storeowner.product.dto;

import java.time.Instant;
import java.util.UUID;

public record ProductReviewDto(UUID id, short rating, String comment, Instant createdAt) {
}