package com.ettee.opscore.cskh.ticket.dto;

import com.ettee.opscore.cskh.ticket.entity.TicketChannel;
import com.ettee.opscore.cskh.ticket.entity.TicketStatus;

import java.time.Instant;
import java.util.UUID;

public record TicketDto(
        UUID id, UUID customerId, UUID orderId, TicketChannel channel, String subject,
        TicketStatus status, short priority, UUID assignedTo, UUID escalatedTo,
        Instant createdAt, Instant resolvedAt
) {
}
