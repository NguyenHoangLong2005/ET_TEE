package com.ettee.opscore.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CreateStaffUserRequest(
        @NotBlank(message = "Họ tên không được để trống") String fullName,
        @Email(message = "Email không hợp lệ") String email,
        String phone,
        @NotBlank(message = "Mật khẩu không được để trống") String password,
        @NotBlank(message = "Mã nhân viên không được để trống") String employeeCode,
        String department,
        @NotEmpty(message = "Phải gán ít nhất 1 role") List<String> roleCodes
) {
}
