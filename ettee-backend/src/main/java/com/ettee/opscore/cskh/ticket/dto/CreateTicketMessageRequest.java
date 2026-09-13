package com.ettee.opscore.cskh.ticket.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateTicketMessageRequest(
        @NotBlank(message = "Nội dung tin nhắn không được để trống") String message,
        String attachmentUrl
) {
}
