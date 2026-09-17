package com.ettee.opscore.systemops.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

import java.math.BigDecimal;

public record UpdateFeatureFlagRequest(
        Boolean enabled,
        @DecimalMin("0") @DecimalMax("100") BigDecimal rolloutPercentage
) {
}
