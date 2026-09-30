package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.UserRepository;
import com.nguyenhoanglong.service.SupportTicketService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/customer/tickets")
public class CustomerTicketController {

    private final SupportTicketService ticketService;
    private final UserRepository userRepository;

    public CustomerTicketController(SupportTicketService ticketService, UserRepository userRepository) {
        this.ticketService = ticketService;
        this.userRepository = userRepository;
    }

    private User getCurrentCustomer() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        }
        String name = auth.getName();
        return userRepository.findByEmail(name)
                .orElseGet(() -> userRepository.findById(name)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không tìm thấy thông tin khách hàng")));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SupportTicketDetailDto>> createCustomerTicket(@Valid @RequestBody CreateTicketDto dto) {
        User customer = getCurrentCustomer();
        SupportTicketDetailDto result = ticketService.createCustomerTicket(customer, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(result));
    }

    @GetMapping("/my-tickets")
    public ResponseEntity<ApiResponse<PaginatedResponseDto<SupportTicketDto>>> getCustomerTickets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        User customer = getCurrentCustomer();
        PaginatedResponseDto<SupportTicketDto> result = ticketService.getCustomerTickets(customer, page, size);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SupportTicketDetailDto>> getCustomerTicketById(@PathVariable String id) {
        User customer = getCurrentCustomer();
        SupportTicketDetailDto result = ticketService.getCustomerTicketById(customer, id);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<ApiResponse<TicketMessageDto>> addCustomerMessage(@PathVariable String id, @Valid @RequestBody AddTicketMessageDto dto) {
        User customer = getCurrentCustomer();
        TicketMessageDto result = ticketService.addCustomerMessage(customer, id, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(result));
    }
}
