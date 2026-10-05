package com.nguyenhoanglong.dto;

import java.time.LocalDateTime;
import java.util.List;

public class UserAdminDto {
    private String id;
    private String employeeCode;
    private String fullName;
    private String email;
    private String phone;
    private String role;
    private Long shopId;
    private String status;
    private String lockReason;
    private String lockedBy;
    private LocalDateTime lockedAt;
    private boolean mustChangePassword;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<String> permissions;

    public UserAdminDto() {}

    public UserAdminDto(String id, String employeeCode, String fullName, String email, String phone,
                        String role, Long shopId, String status, String lockReason, String lockedBy,
                        LocalDateTime lockedAt, boolean mustChangePassword, LocalDateTime createdAt,
                        LocalDateTime updatedAt, List<String> permissions) {
        this.id = id;
        this.employeeCode = employeeCode;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.role = role;
        this.shopId = shopId;
        this.status = status;
        this.lockReason = lockReason;
        this.lockedBy = lockedBy;
        this.lockedAt = lockedAt;
        this.mustChangePassword = mustChangePassword;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.permissions = permissions;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmployeeCode() { return employeeCode; }
    public void setEmployeeCode(String employeeCode) { this.employeeCode = employeeCode; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Long getShopId() { return shopId; }
    public void setShopId(Long shopId) { this.shopId = shopId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getLockReason() { return lockReason; }
    public void setLockReason(String lockReason) { this.lockReason = lockReason; }

    public String getLockedBy() { return lockedBy; }
    public void setLockedBy(String lockedBy) { this.lockedBy = lockedBy; }

    public LocalDateTime getLockedAt() { return lockedAt; }
    public void setLockedAt(LocalDateTime lockedAt) { this.lockedAt = lockedAt; }

    public boolean isMustChangePassword() { return mustChangePassword; }
    public void setMustChangePassword(boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }

    /** Set only in the create response when the server generated the first password (shown once). */
    private String temporaryPassword;
    public String getTemporaryPassword() { return temporaryPassword; }
    public void setTemporaryPassword(String temporaryPassword) { this.temporaryPassword = temporaryPassword; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<String> getPermissions() { return permissions; }
    public void setPermissions(List<String> permissions) { this.permissions = permissions; }

    public static UserAdminDtoBuilder builder() { return new UserAdminDtoBuilder(); }

    public static class UserAdminDtoBuilder {
        private String id;
        private String employeeCode;
        private String fullName;
        private String email;
        private String phone;
        private String role;
        private Long shopId;
        private String status;
        private String lockReason;
        private String lockedBy;
        private LocalDateTime lockedAt;
        private boolean mustChangePassword;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private List<String> permissions;

        public UserAdminDtoBuilder id(String id) { this.id = id; return this; }
        public UserAdminDtoBuilder employeeCode(String employeeCode) { this.employeeCode = employeeCode; return this; }
        public UserAdminDtoBuilder fullName(String fullName) { this.fullName = fullName; return this; }
        public UserAdminDtoBuilder email(String email) { this.email = email; return this; }
        public UserAdminDtoBuilder phone(String phone) { this.phone = phone; return this; }
        public UserAdminDtoBuilder role(String role) { this.role = role; return this; }
        public UserAdminDtoBuilder shopId(Long shopId) { this.shopId = shopId; return this; }
        public UserAdminDtoBuilder status(String status) { this.status = status; return this; }
        public UserAdminDtoBuilder lockReason(String lockReason) { this.lockReason = lockReason; return this; }
        public UserAdminDtoBuilder lockedBy(String lockedBy) { this.lockedBy = lockedBy; return this; }
        public UserAdminDtoBuilder lockedAt(LocalDateTime lockedAt) { this.lockedAt = lockedAt; return this; }
        public UserAdminDtoBuilder mustChangePassword(boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; return this; }
        public UserAdminDtoBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public UserAdminDtoBuilder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }
        public UserAdminDtoBuilder permissions(List<String> permissions) { this.permissions = permissions; return this; }

        public UserAdminDto build() {
            return new UserAdminDto(id, employeeCode, fullName, email, phone, role, shopId, status, lockReason, lockedBy, lockedAt, mustChangePassword, createdAt, updatedAt, permissions);
        }
    }
}
