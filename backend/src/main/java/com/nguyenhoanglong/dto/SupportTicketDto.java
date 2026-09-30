package com.nguyenhoanglong.dto;

import java.time.LocalDateTime;

public class SupportTicketDto {
    private String id;
    private String ticketCode;
    private String customerId;
    private String customerName;
    private String customerEmail;
    private Long orderId;
    private String orderCode;
    private Long shopId;
    private String channel;
    private String subject;
    private String status;
    private Integer priority;
    private String assignedTo;
    private String assignedToName;
    private String escalatedTo;
    private String escalatedToName;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
    private TicketMessageDto lastMessage;

    public SupportTicketDto() {}

    public SupportTicketDto(String id, String ticketCode, String customerId, String customerName, String customerEmail, Long orderId, String orderCode, Long shopId, String channel, String subject, String status, Integer priority, String assignedTo, String assignedToName, String escalatedTo, String escalatedToName, LocalDateTime createdAt, LocalDateTime resolvedAt, TicketMessageDto lastMessage) {
        this.id = id;
        this.ticketCode = ticketCode;
        this.customerId = customerId;
        this.customerName = customerName;
        this.customerEmail = customerEmail;
        this.orderId = orderId;
        this.orderCode = orderCode;
        this.shopId = shopId;
        this.channel = channel;
        this.subject = subject;
        this.status = status;
        this.priority = priority;
        this.assignedTo = assignedTo;
        this.assignedToName = assignedToName;
        this.escalatedTo = escalatedTo;
        this.escalatedToName = escalatedToName;
        this.createdAt = createdAt;
        this.resolvedAt = resolvedAt;
        this.lastMessage = lastMessage;
    }

    public static SupportTicketDtoBuilder builder() {
        return new SupportTicketDtoBuilder();
    }

    public static class SupportTicketDtoBuilder {
        private String id;
        private String ticketCode;
        private String customerId;
        private String customerName;
        private String customerEmail;
        private Long orderId;
        private String orderCode;
        private Long shopId;
        private String channel;
        private String subject;
        private String status;
        private Integer priority;
        private String assignedTo;
        private String assignedToName;
        private String escalatedTo;
        private String escalatedToName;
        private LocalDateTime createdAt;
        private LocalDateTime resolvedAt;
        private TicketMessageDto lastMessage;

        public SupportTicketDtoBuilder id(String id) { this.id = id; return this; }
        public SupportTicketDtoBuilder ticketCode(String ticketCode) { this.ticketCode = ticketCode; return this; }
        public SupportTicketDtoBuilder customerId(String customerId) { this.customerId = customerId; return this; }
        public SupportTicketDtoBuilder customerName(String customerName) { this.customerName = customerName; return this; }
        public SupportTicketDtoBuilder customerEmail(String customerEmail) { this.customerEmail = customerEmail; return this; }
        public SupportTicketDtoBuilder orderId(Long orderId) { this.orderId = orderId; return this; }
        public SupportTicketDtoBuilder orderCode(String orderCode) { this.orderCode = orderCode; return this; }
        public SupportTicketDtoBuilder shopId(Long shopId) { this.shopId = shopId; return this; }
        public SupportTicketDtoBuilder channel(String channel) { this.channel = channel; return this; }
        public SupportTicketDtoBuilder subject(String subject) { this.subject = subject; return this; }
        public SupportTicketDtoBuilder status(String status) { this.status = status; return this; }
        public SupportTicketDtoBuilder priority(Integer priority) { this.priority = priority; return this; }
        public SupportTicketDtoBuilder assignedTo(String assignedTo) { this.assignedTo = assignedTo; return this; }
        public SupportTicketDtoBuilder assignedToName(String assignedToName) { this.assignedToName = assignedToName; return this; }
        public SupportTicketDtoBuilder escalatedTo(String escalatedTo) { this.escalatedTo = escalatedTo; return this; }
        public SupportTicketDtoBuilder escalatedToName(String escalatedToName) { this.escalatedToName = escalatedToName; return this; }
        public SupportTicketDtoBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public SupportTicketDtoBuilder resolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; return this; }
        public SupportTicketDtoBuilder lastMessage(TicketMessageDto lastMessage) { this.lastMessage = lastMessage; return this; }

        public SupportTicketDto build() {
            return new SupportTicketDto(id, ticketCode, customerId, customerName, customerEmail, orderId, orderCode, shopId, channel, subject, status, priority, assignedTo, assignedToName, escalatedTo, escalatedToName, createdAt, resolvedAt, lastMessage);
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTicketCode() { return ticketCode; }
    public void setTicketCode(String ticketCode) { this.ticketCode = ticketCode; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }

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

    public String getAssignedToName() { return assignedToName; }
    public void setAssignedToName(String assignedToName) { this.assignedToName = assignedToName; }

    public String getEscalatedTo() { return escalatedTo; }
    public void setEscalatedTo(String escalatedTo) { this.escalatedTo = escalatedTo; }

    public String getEscalatedToName() { return escalatedToName; }
    public void setEscalatedToName(String escalatedToName) { this.escalatedToName = escalatedToName; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }

    public TicketMessageDto getLastMessage() { return lastMessage; }
    public void setLastMessage(TicketMessageDto lastMessage) { this.lastMessage = lastMessage; }
}
