package com.nguyenhoanglong.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "inventory_adjustments")
public class InventoryAdjustment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "adjustment_id", nullable = false, updatable = false)
    private Long adjustmentId;

    @Column(name = "inventory_id", nullable = false)
    private UUID inventoryId;

    @Column(name = "difference", nullable = false)
    private Integer difference;

    @Column(name = "reason", nullable = false, length = 500)
    private String reason;

    @Column(name = "requested_by")
    private Long requestedBy;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "PENDING";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getAdjustmentId() { return adjustmentId; }
    public void setAdjustmentId(Long adjustmentId) { this.adjustmentId = adjustmentId; }
    public UUID getInventoryId() { return inventoryId; }
    public void setInventoryId(UUID inventoryId) { this.inventoryId = inventoryId; }
    public Integer getDifference() { return difference; }
    public void setDifference(Integer difference) { this.difference = difference; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public Long getRequestedBy() { return requestedBy; }
    public void setRequestedBy(Long requestedBy) { this.requestedBy = requestedBy; }
    public Long getApprovedBy() { return approvedBy; }
    public void setApprovedBy(Long approvedBy) { this.approvedBy = approvedBy; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
