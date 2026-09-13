package com.ettee.opscore.cskh.returns.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateRefundRequest(
        UUID returnRequestId,
        @NotNull UUID paymentId,
        @NotNull @DecimalMin(value = "0.01", message = "Số tiền hoàn phải > 0") BigDecimal amount
) {
}
