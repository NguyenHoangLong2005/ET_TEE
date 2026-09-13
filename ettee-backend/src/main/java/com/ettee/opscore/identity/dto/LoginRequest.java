package com.ettee.opscore.identity.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Vui lòng nhập email hoặc số điện thoại") String usernameOrPhone,
        @NotBlank(message = "Vui lòng nhập mật khẩu") String password
) {
}
