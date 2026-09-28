package com.nguyenhoanglong.dto;

import jakarta.validation.constraints.NotBlank;

public class UserUpdateDto {

    private String employeeCode;

    @NotBlank(message = "Họ tên không được để trống")
    private String fullName;

    private String phone;

    @NotBlank(message = "Vai trò (roleCode) không được để trống")
    private String roleCode;

    private Long shopId;

    public UserUpdateDto() {}

    public UserUpdateDto(String employeeCode, String fullName, String phone, String roleCode, Long shopId) {
        this.employeeCode = employeeCode;
        this.fullName = fullName;
        this.phone = phone;
        this.roleCode = roleCode;
        this.shopId = shopId;
    }

    public String getEmployeeCode() { return employeeCode; }
    public void setEmployeeCode(String employeeCode) { this.employeeCode = employeeCode; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getRoleCode() { return roleCode; }
    public void setRoleCode(String roleCode) { this.roleCode = roleCode; }

    public Long getShopId() { return shopId; }
    public void setShopId(Long shopId) { this.shopId = shopId; }
}
