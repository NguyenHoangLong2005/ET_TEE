package com.ettee.opscore.cskh.ticket.dto;

import com.ettee.opscore.cskh.ticket.entity.TicketStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateTicketStatusRequest(@NotNull TicketStatus status) {
}
