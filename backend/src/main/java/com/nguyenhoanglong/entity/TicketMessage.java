package com.nguyenhoanglong.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "ticket_messages")
public class TicketMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "ticket_id", nullable = false)
    private String ticketId;

    @Column(name = "sender_type", nullable = false)
    private String senderType;

    @Column(name = "sender_id")
    private String senderId;

    @Column(name = "sender_name")
    private String senderName;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "attachment_url")
    private String attachmentUrl;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public TicketMessage() {}

    public TicketMessage(String id, String ticketId, String senderType, String senderId, String senderName, String message, String attachmentUrl, LocalDateTime createdAt) {
        this.id = id;
        this.ticketId = ticketId;
        this.senderType = senderType;
        this.senderId = senderId;
        this.senderName = senderName;
        this.message = message;
        this.attachmentUrl = attachmentUrl;
        this.createdAt = createdAt;
    }

    public static TicketMessageBuilder builder() {
        return new TicketMessageBuilder();
    }

    public static class TicketMessageBuilder {
        private String id;
        private String ticketId;
        private String senderType;
        private String senderId;
        private String senderName;
        private String message;
        private String attachmentUrl;
        private LocalDateTime createdAt;

        public TicketMessageBuilder id(String id) { this.id = id; return this; }
        public TicketMessageBuilder ticketId(String ticketId) { this.ticketId = ticketId; return this; }
        public TicketMessageBuilder senderType(String senderType) { this.senderType = senderType; return this; }
        public TicketMessageBuilder senderId(String senderId) { this.senderId = senderId; return this; }
        public TicketMessageBuilder senderName(String senderName) { this.senderName = senderName; return this; }
        public TicketMessageBuilder message(String message) { this.message = message; return this; }
        public TicketMessageBuilder attachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; return this; }
        public TicketMessageBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }

        public TicketMessage build() {
            return new TicketMessage(id, ticketId, senderType, senderId, senderName, message, attachmentUrl, createdAt);
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTicketId() { return ticketId; }
    public void setTicketId(String ticketId) { this.ticketId = ticketId; }

    public String getSenderType() { return senderType; }
    public void setSenderType(String senderType) { this.senderType = senderType; }

    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }

    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getAttachmentUrl() { return attachmentUrl; }
    public void setAttachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
