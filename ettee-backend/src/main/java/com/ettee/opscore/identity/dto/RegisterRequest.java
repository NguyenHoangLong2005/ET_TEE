package com.ettee.opscore.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record RegisterRequest(
        @NotBlank(message = "Vui lòng nhập họ tên") String fullName,
        @Email(message = "Email không hợp lệ") String email,
        @Pattern(regexp = "^[0-9+\\s-]{9,20}$", message = "Số điện thoại không hợp lệ") String phone,
        @NotBlank(message = "Vui lòng nhập mật khẩu") String password) {
}
