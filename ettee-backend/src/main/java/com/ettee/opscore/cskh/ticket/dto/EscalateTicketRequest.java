package com.ettee.opscore.cskh.ticket.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** "Chuyển khiếu nại lên cấp quản lý" — escalated_to là user quản lý (thường là shop_owner/admin). */
public record EscalateTicketRequest(@NotNull UUID escalateToUserId, String note) {
}
