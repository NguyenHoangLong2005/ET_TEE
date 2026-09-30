package com.nguyenhoanglong.dto;

import java.time.LocalDateTime;

public class TicketMessageDto {
    private String id;
    private String ticketId;
    private String senderType;
    private String senderId;
    private String senderName;
    private String message;
    private String attachmentUrl;
    private LocalDateTime createdAt;

    public TicketMessageDto() {}

    public TicketMessageDto(String id, String ticketId, String senderType, String senderId, String senderName, String message, String attachmentUrl, LocalDateTime createdAt) {
        this.id = id;
        this.ticketId = ticketId;
        this.senderType = senderType;
        this.senderId = senderId;
        this.senderName = senderName;
        this.message = message;
        this.attachmentUrl = attachmentUrl;
        this.createdAt = createdAt;
    }

    public static TicketMessageDtoBuilder builder() {
        return new TicketMessageDtoBuilder();
    }

    public static class TicketMessageDtoBuilder {
        private String id;
        private String ticketId;
        private String senderType;
        private String senderId;
        private String senderName;
        private String message;
        private String attachmentUrl;
        private LocalDateTime createdAt;

        public TicketMessageDtoBuilder id(String id) { this.id = id; return this; }
        public TicketMessageDtoBuilder ticketId(String ticketId) { this.ticketId = ticketId; return this; }
        public TicketMessageDtoBuilder senderType(String senderType) { this.senderType = senderType; return this; }
        public TicketMessageDtoBuilder senderId(String senderId) { this.senderId = senderId; return this; }
        public TicketMessageDtoBuilder senderName(String senderName) { this.senderName = senderName; return this; }
        public TicketMessageDtoBuilder message(String message) { this.message = message; return this; }
        public TicketMessageDtoBuilder attachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; return this; }
        public TicketMessageDtoBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }

        public TicketMessageDto build() {
            return new TicketMessageDto(id, ticketId, senderType, senderId, senderName, message, attachmentUrl, createdAt);
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
