package com.ettee.opscore.identity.dto;

import jakarta.validation.constraints.NotBlank;

public record RefreshTokenRequest(@NotBlank(message = "Thiếu refreshToken") String refreshToken) {
}
