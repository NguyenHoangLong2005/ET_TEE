package com.ettee.opscore.cskh.ticket.controller;

import com.ettee.opscore.cskh.ticket.dto.*;
import com.ettee.opscore.cskh.ticket.entity.TicketStatus;
import com.ettee.opscore.cskh.ticket.service.TicketService;
import com.ettee.opscore.common.dto.ApiResponse;
import com.ettee.opscore.common.dto.PageResponse;
import com.ettee.opscore.security.JwtPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Nghiệp vụ "Chat khách hàng, quản lý ticket" — permission support.handle. */
@RestController
@RequestMapping("/api/cskh/tickets")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('support.handle')")
public class CskhTicketController {

    private final TicketService ticketService;

    @GetMapping
    public ApiResponse<PageResponse<TicketDto>> search(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) UUID assignedTo,
            Pageable pageable
    ) {
        return ApiResponse.ok(ticketService.search(status, assignedTo, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<TicketDto> getById(@PathVariable UUID id) {
        return ApiResponse.ok(ticketService.getById(id));
    }

    @GetMapping("/{id}/messages")
    public ApiResponse<List<TicketMessageDto>> getMessages(@PathVariable UUID id) {
        return ApiResponse.ok(ticketService.getMessages(id));
    }

    @PostMapping("/{id}/messages")
    public ApiResponse<TicketMessageDto> reply(
            @PathVariable UUID id,
            @Valid @RequestBody CreateTicketMessageRequest request,
            @AuthenticationPrincipal JwtPrincipal actor
    ) {
        return ApiResponse.ok(ticketService.reply(id, request, actor.userId()), "Đã gửi trả lời");
    }

    @PostMapping("/{id}/assign")
    public ApiResponse<TicketDto> assign(@PathVariable UUID id, @Valid @RequestBody AssignTicketRequest request) {
        return ApiResponse.ok(ticketService.assign(id, request.staffUserId()), "Đã gán ticket");
    }

    @PostMapping("/{id}/escalate")
    public ApiResponse<TicketDto> escalate(
            @PathVariable UUID id,
            @Valid @RequestBody EscalateTicketRequest request,
            @AuthenticationPrincipal JwtPrincipal actor
    ) {
        return ApiResponse.ok(ticketService.escalate(id, request, actor.userId()), "Đã chuyển khiếu nại lên cấp quản lý");
    }

    @PutMapping("/{id}/status")
    public ApiResponse<TicketDto> updateStatus(@PathVariable UUID id, @Valid @RequestBody UpdateTicketStatusRequest request) {
        return ApiResponse.ok(ticketService.updateStatus(id, request.status()), "Đã cập nhật trạng thái ticket");
    }
}
