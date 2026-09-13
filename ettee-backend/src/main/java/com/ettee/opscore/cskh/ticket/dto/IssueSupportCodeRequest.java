package com.ettee.opscore.cskh.ticket.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record IssueSupportCodeRequest(
        @NotNull UUID ticketId,
        @NotNull UUID customerId,
        @NotNull @DecimalMin(value = "0.01", message = "Giá trị mã phải > 0") BigDecimal value,
        @NotNull Instant expiresAt
) {
}
