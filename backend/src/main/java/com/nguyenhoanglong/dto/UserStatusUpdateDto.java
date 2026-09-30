package com.nguyenhoanglong.dto;

import jakarta.validation.constraints.NotBlank;

public class UserStatusUpdateDto {

    @NotBlank(message = "Trạng thái không được để trống")
    private String status;

    private String lockReason;

    public UserStatusUpdateDto() {}

    public UserStatusUpdateDto(String status, String lockReason) {
        this.status = status;
        this.lockReason = lockReason;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getLockReason() { return lockReason; }
    public void setLockReason(String lockReason) { this.lockReason = lockReason; }
}
