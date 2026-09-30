package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.UserRepository;
import com.nguyenhoanglong.service.SupportTicketService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/staff/support/tickets")
@PreAuthorize("hasAnyRole('ADMIN', 'CSKH_STAFF')")
public class StaffSupportTicketController {

    private final SupportTicketService ticketService;
    private final UserRepository userRepository;

    public StaffSupportTicketController(SupportTicketService ticketService, UserRepository userRepository) {
        this.ticketService = ticketService;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        }
        String name = auth.getName();
        return userRepository.findByEmail(name)
                .orElseGet(() -> userRepository.findById(name)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không tìm thấy người dùng")));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PaginatedResponseDto<SupportTicketDto>>> getStaffTickets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer priority,
            @RequestParam(required = false) String assignedTo,
            @RequestParam(required = false) String search
    ) {
        User actor = getCurrentUser();
        PaginatedResponseDto<SupportTicketDto> result = ticketService.getStaffTickets(actor, page, size, status, priority, assignedTo, search);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SupportTicketDetailDto>> getStaffTicketById(@PathVariable String id) {
        User actor = getCurrentUser();
        SupportTicketDetailDto result = ticketService.getStaffTicketById(actor, id);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SupportTicketDetailDto>> createStaffTicket(@Valid @RequestBody CreateTicketDto dto) {
        User actor = getCurrentUser();
        SupportTicketDetailDto result = ticketService.createStaffTicket(actor, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(result));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<SupportTicketDto>> updateTicketStatus(@PathVariable String id, @Valid @RequestBody UpdateTicketStatusDto dto) {
        User actor = getCurrentUser();
        SupportTicketDto result = ticketService.updateTicketStatus(actor, id, dto);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<ApiResponse<TicketMessageDto>> addStaffMessage(@PathVariable String id, @Valid @RequestBody AddTicketMessageDto dto) {
        User actor = getCurrentUser();
        TicketMessageDto result = ticketService.addStaffMessage(actor, id, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(result));
    }

    @PatchMapping("/{id}/assign")
    public ResponseEntity<ApiResponse<SupportTicketDto>> assignTicket(@PathVariable String id, @RequestBody AssignTicketDto dto) {
        User actor = getCurrentUser();
        SupportTicketDto result = ticketService.assignTicket(actor, id, dto);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}/assignable-staff")
    public ResponseEntity<ApiResponse<java.util.List<UserCandidateDto>>> getAssignableStaff(@PathVariable String id) {
        User actor = getCurrentUser();
        java.util.List<UserCandidateDto> list = ticketService.getAssignableStaffCandidates(actor, id);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/{id}/escalatable-owners")
    public ResponseEntity<ApiResponse<java.util.List<UserCandidateDto>>> getEscalatableOwners(@PathVariable String id) {
        User actor = getCurrentUser();
        java.util.List<UserCandidateDto> list = ticketService.getEscalatableOwnerCandidates(actor, id);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/all-staff")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<java.util.List<UserCandidateDto>>> getAllStaffCandidates() {
        User actor = getCurrentUser();
        java.util.List<UserCandidateDto> list = ticketService.getAllStaffCandidates(actor);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PatchMapping("/{id}/link-order")
    public ResponseEntity<ApiResponse<SupportTicketDetailDto>> linkOrderToTicket(
            @PathVariable String id,
            @Valid @RequestBody LinkOrderTicketDto dto) {
        User actor = getCurrentUser();
        SupportTicketDetailDto result = ticketService.linkOrderToTicket(actor, id, dto);
        return ResponseEntity.ok(ApiResponse.success("Liên kết đơn hàng vào ticket thành công", result));
    }
}
