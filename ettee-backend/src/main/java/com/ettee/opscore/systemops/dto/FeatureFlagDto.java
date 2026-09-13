package com.ettee.opscore.systemops.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record FeatureFlagDto(UUID id, String key, String description, boolean enabled,
                              BigDecimal rolloutPercentage, Instant updatedAt) {
}
