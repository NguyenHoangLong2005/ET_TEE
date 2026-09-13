package com.ettee.opscore.admin.dto;

import jakarta.validation.constraints.NotBlank;

public record LockUserRequest(@NotBlank(message = "Vui lòng nêu lý do khóa tài khoản") String reason) {
}
