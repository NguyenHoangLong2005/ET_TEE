package com.nguyenhoanglong.dto;

import java.time.LocalDateTime;

public class StoreApprovalItemDto {
    private String approvalId;
    private String type; // VOUCHER | INVENTORY_ADJUSTMENT
    private String title;
    private String description;
    private String requestedBy;
    private String status;
    private LocalDateTime createdAt;

    public StoreApprovalItemDto() {}

    public StoreApprovalItemDto(String approvalId, String type, String title, String description,
                                String requestedBy, String status, LocalDateTime createdAt) {
        this.approvalId = approvalId;
        this.type = type;
        this.title = title;
        this.description = description;
        this.requestedBy = requestedBy;
        this.status = status;
        this.createdAt = createdAt;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String approvalId;
        private String type;
        private String title;
        private String description;
        private String requestedBy;
        private String status;
        private LocalDateTime createdAt;

        public Builder approvalId(String approvalId) { this.approvalId = approvalId; return this; }
        public Builder type(String type) { this.type = type; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder requestedBy(String requestedBy) { this.requestedBy = requestedBy; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }

        public StoreApprovalItemDto build() {
            return new StoreApprovalItemDto(approvalId, type, title, description, requestedBy, status, createdAt);
        }
    }

    public String getApprovalId() { return approvalId; }
    public void setApprovalId(String approvalId) { this.approvalId = approvalId; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getRequestedBy() { return requestedBy; }
    public void setRequestedBy(String requestedBy) { this.requestedBy = requestedBy; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
