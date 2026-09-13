package com.ettee.opscore.cskh.returns.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.UUID;

public record CreateReturnRequestDto(
        @NotNull UUID orderId,
        @Pattern(regexp = "return_refund|exchange", message = "request_type phải là return_refund hoặc exchange")
        String requestType,
        @NotBlank(message = "Vui lòng nêu lý do đổi/trả") String reason
) {
}
