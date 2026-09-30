package com.nguyenhoanglong.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "support_tickets")
public class SupportTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "ticket_code", unique = true, nullable = false)
    private String ticketCode;

    @Column(name = "customer_id")
    private String customerId;

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "shop_id")
    private Long shopId;

    @Column(nullable = false)
    private String channel = "CHAT";

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false)
    private String status = "OPEN";

    @Column(nullable = false)
    private Integer priority = 3;

    @Column(name = "assigned_to")
    private String assignedTo;

    @Column(name = "escalated_to")
    private String escalatedTo;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public SupportTicket() {}

    public SupportTicket(String id, String ticketCode, String customerId, Long orderId, Long shopId, String channel, String subject, String status, Integer priority, String assignedTo, String escalatedTo, LocalDateTime createdAt, LocalDateTime resolvedAt, LocalDateTime updatedAt) {
        this.id = id;
        this.ticketCode = ticketCode;
        this.customerId = customerId;
        this.orderId = orderId;
        this.shopId = shopId;
        this.channel = channel != null ? channel : "CHAT";
        this.subject = subject;
        this.status = status != null ? status : "OPEN";
        this.priority = priority != null ? priority : 3;
        this.assignedTo = assignedTo;
        this.escalatedTo = escalatedTo;
        this.createdAt = createdAt;
        this.resolvedAt = resolvedAt;
        this.updatedAt = updatedAt;
    }

    public static SupportTicketBuilder builder() {
        return new SupportTicketBuilder();
    }

    public static class SupportTicketBuilder {
        private String id;
        private String ticketCode;
        private String customerId;
        private Long orderId;
        private Long shopId;
        private String channel = "CHAT";
        private String subject;
        private String status = "OPEN";
        private Integer priority = 3;
        private String assignedTo;
        private String escalatedTo;
        private LocalDateTime createdAt;
        private LocalDateTime resolvedAt;
        private LocalDateTime updatedAt;

        public SupportTicketBuilder id(String id) { this.id = id; return this; }
        public SupportTicketBuilder ticketCode(String ticketCode) { this.ticketCode = ticketCode; return this; }
        public SupportTicketBuilder customerId(String customerId) { this.customerId = customerId; return this; }
        public SupportTicketBuilder orderId(Long orderId) { this.orderId = orderId; return this; }
        public SupportTicketBuilder shopId(Long shopId) { this.shopId = shopId; return this; }
        public SupportTicketBuilder channel(String channel) { this.channel = channel; return this; }
        public SupportTicketBuilder subject(String subject) { this.subject = subject; return this; }
        public SupportTicketBuilder status(String status) { this.status = status; return this; }
        public SupportTicketBuilder priority(Integer priority) { this.priority = priority; return this; }
        public SupportTicketBuilder assignedTo(String assignedTo) { this.assignedTo = assignedTo; return this; }
        public SupportTicketBuilder escalatedTo(String escalatedTo) { this.escalatedTo = escalatedTo; return this; }
        public SupportTicketBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public SupportTicketBuilder resolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; return this; }
        public SupportTicketBuilder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }

        public SupportTicket build() {
            return new SupportTicket(id, ticketCode, customerId, orderId, shopId, channel, subject, status, priority, assignedTo, escalatedTo, createdAt, resolvedAt, updatedAt);
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTicketCode() { return ticketCode; }
    public void setTicketCode(String ticketCode) { this.ticketCode = ticketCode; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public Long getShopId() { return shopId; }
    public void setShopId(Long shopId) { this.shopId = shopId; }

    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getPriority() { return priority; }
    public void setPriority(Integer priority) { this.priority = priority; }

    public String getAssignedTo() { return assignedTo; }
    public void setAssignedTo(String assignedTo) { this.assignedTo = assignedTo; }

    public String getEscalatedTo() { return escalatedTo; }
    public void setEscalatedTo(String escalatedTo) { this.escalatedTo = escalatedTo; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
