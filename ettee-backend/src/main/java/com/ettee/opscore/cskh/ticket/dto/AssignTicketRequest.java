package com.ettee.opscore.cskh.ticket.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AssignTicketRequest(@NotNull UUID staffUserId) {
}
