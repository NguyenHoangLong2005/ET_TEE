package com.nguyenhoanglong.dto;

import java.time.LocalDateTime;

public class ShopAuditLogDto {
    private String id;
    private Long shopId;
    private String action;
    private String actorName;
    private String actorRole;
    private String staffId;
    private String staffName;
    private String description;
    private String oldValue;
    private String newValue;
    private String ipAddress;
    private LocalDateTime timestamp;

    public ShopAuditLogDto() {}

    public ShopAuditLogDto(String id, Long shopId, String action, String actorName, String actorRole,
                           String staffId, String staffName, String description, String oldValue, String newValue,
                           String ipAddress, LocalDateTime timestamp) {
        this.id = id;
        this.shopId = shopId;
        this.action = action;
        this.actorName = actorName;
        this.actorRole = actorRole;
        this.staffId = staffId;
        this.staffName = staffName;
        this.description = description;
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.ipAddress = ipAddress;
        this.timestamp = timestamp;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String id;
        private Long shopId;
        private String action;
        private String actorName;
        private String actorRole;
        private String staffId;
        private String staffName;
        private String description;
        private String oldValue;
        private String newValue;
        private String ipAddress;
        private LocalDateTime timestamp;

        public Builder id(String id) { this.id = id; return this; }
        public Builder shopId(Long shopId) { this.shopId = shopId; return this; }
        public Builder action(String action) { this.action = action; return this; }
        public Builder actorName(String actorName) { this.actorName = actorName; return this; }
        public Builder actorRole(String actorRole) { this.actorRole = actorRole; return this; }
        public Builder staffId(String staffId) { this.staffId = staffId; return this; }
        public Builder staffName(String staffName) { this.staffName = staffName; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder oldValue(String oldValue) { this.oldValue = oldValue; return this; }
        public Builder newValue(String newValue) { this.newValue = newValue; return this; }
        public Builder ipAddress(String ipAddress) { this.ipAddress = ipAddress; return this; }
        public Builder timestamp(LocalDateTime timestamp) { this.timestamp = timestamp; return this; }

        public ShopAuditLogDto build() {
            return new ShopAuditLogDto(id, shopId, action, actorName, actorRole, staffId, staffName,
                    description, oldValue, newValue, ipAddress, timestamp);
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Long getShopId() { return shopId; }
    public void setShopId(Long shopId) { this.shopId = shopId; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getActorName() { return actorName; }
    public void setActorName(String actorName) { this.actorName = actorName; }
    public String getActorRole() { return actorRole; }
    public void setActorRole(String actorRole) { this.actorRole = actorRole; }
    public String getStaffId() { return staffId; }
    public void setStaffId(String staffId) { this.staffId = staffId; }
    public String getStaffName() { return staffName; }
    public void setStaffName(String staffName) { this.staffName = staffName; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getOldValue() { return oldValue; }
    public void setOldValue(String oldValue) { this.oldValue = oldValue; }
    public String getNewValue() { return newValue; }
    public void setNewValue(String newValue) { this.newValue = newValue; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
