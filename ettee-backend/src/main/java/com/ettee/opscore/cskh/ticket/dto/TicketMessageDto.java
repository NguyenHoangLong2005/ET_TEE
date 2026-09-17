package com.ettee.opscore.cskh.ticket.dto;

import com.ettee.opscore.cskh.ticket.entity.SenderType;

import java.time.Instant;
import java.util.UUID;

public record TicketMessageDto(
        UUID id, UUID ticketId, SenderType senderType, UUID senderId,
        String message, String attachmentUrl, Instant createdAt
) {
}
