package com.ettee.opscore.admin.dto;

import jakarta.validation.constraints.NotBlank;

public record AssignRoleRequest(@NotBlank(message = "Vui lòng chọn role") String roleCode) {
}
