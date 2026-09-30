package com.nguyenhoanglong.dto;

import jakarta.validation.constraints.NotBlank;

public class AddTicketMessageDto {
    @NotBlank(message = "Nội dung tin nhắn không được để trống")
    private String message;
    private String attachmentUrl;

    public AddTicketMessageDto() {}

    public AddTicketMessageDto(String message, String attachmentUrl) {
        this.message = message;
        this.attachmentUrl = attachmentUrl;
    }

    public static AddTicketMessageDtoBuilder builder() {
        return new AddTicketMessageDtoBuilder();
    }

    public static class AddTicketMessageDtoBuilder {
        private String message;
        private String attachmentUrl;

        public AddTicketMessageDtoBuilder message(String message) { this.message = message; return this; }
        public AddTicketMessageDtoBuilder attachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; return this; }

        public AddTicketMessageDto build() {
            return new AddTicketMessageDto(message, attachmentUrl);
        }
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getAttachmentUrl() { return attachmentUrl; }
    public void setAttachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; }
}
