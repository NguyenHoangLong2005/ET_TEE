package com.nguyenhoanglong.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class ShopWorkShiftDto {
    private Long id;
    private Long shopId;
    private String userId;
    private String userFullName;
    private LocalDate shiftDate;
    private String shiftType;
    private String note;
    private String status;
    private LocalDateTime createdAt;

    public ShopWorkShiftDto() {}

    public ShopWorkShiftDto(Long id, Long shopId, String userId, String userFullName,
                           LocalDate shiftDate, String shiftType, String note, String status, LocalDateTime createdAt) {
        this.id = id;
        this.shopId = shopId;
        this.userId = userId;
        this.userFullName = userFullName;
        this.shiftDate = shiftDate;
        this.shiftType = shiftType;
        this.note = note;
        this.status = status;
        this.createdAt = createdAt;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private Long shopId;
        private String userId;
        private String userFullName;
        private LocalDate shiftDate;
        private String shiftType;
        private String note;
        private String status;
        private LocalDateTime createdAt;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder shopId(Long shopId) { this.shopId = shopId; return this; }
        public Builder userId(String userId) { this.userId = userId; return this; }
        public Builder userFullName(String userFullName) { this.userFullName = userFullName; return this; }
        public Builder shiftDate(LocalDate shiftDate) { this.shiftDate = shiftDate; return this; }
        public Builder shiftType(String shiftType) { this.shiftType = shiftType; return this; }
        public Builder note(String note) { this.note = note; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }

        public ShopWorkShiftDto build() {
            return new ShopWorkShiftDto(id, shopId, userId, userFullName, shiftDate, shiftType, note, status, createdAt);
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getShopId() { return shopId; }
    public void setShopId(Long shopId) { this.shopId = shopId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getUserFullName() { return userFullName; }
    public void setUserFullName(String userFullName) { this.userFullName = userFullName; }
    public LocalDate getShiftDate() { return shiftDate; }
    public void setShiftDate(LocalDate shiftDate) { this.shiftDate = shiftDate; }
    public String getShiftType() { return shiftType; }
    public void setShiftType(String shiftType) { this.shiftType = shiftType; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
