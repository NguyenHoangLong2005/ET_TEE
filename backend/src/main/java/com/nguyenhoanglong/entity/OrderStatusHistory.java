package com.nguyenhoanglong.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "order_status_history")
@EntityListeners(com.nguyenhoanglong.config.OrderStatusHistoryMailListener.class)
public class OrderStatusHistory {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "from_status")
    private String fromStatus;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "old_status")
    private String oldStatus;

    @Column(name = "new_status")
    private String newStatus;

    @PrePersist
    @PreUpdate
    public void syncStatusFields() {
        if (this.newStatus == null) {
            this.newStatus = this.status;
        }
        if (this.status == null) {
            this.status = this.newStatus;
        }
        if (this.oldStatus == null) {
            this.oldStatus = this.fromStatus;
        }
        if (this.fromStatus == null) {
            this.fromStatus = this.oldStatus;
        }
    }

    public String getOldStatus() { return oldStatus; }
    public void setOldStatus(String oldStatus) { this.oldStatus = oldStatus; }

    public String getNewStatus() { return newStatus; }
    public void setNewStatus(String newStatus) { this.newStatus = newStatus; }


    @Column(name = "changed_by")
    private String changedBy;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public OrderStatusHistory() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public String getFromStatus() { return fromStatus; }
    public void setFromStatus(String fromStatus) { this.fromStatus = fromStatus; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getChangedBy() { return changedBy; }
    public void setChangedBy(String changedBy) { this.changedBy = changedBy; }


    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
