package com.nguyenhoanglong.controller.staff;

import com.nguyenhoanglong.entity.OrderStatus;
import com.nguyenhoanglong.entity.OrderStatusHistory;
import com.nguyenhoanglong.service.SalesOrderService;
import com.nguyenhoanglong.service.OrderStateMachine;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/staff/sales")
// Class level grants read access only. Verification, confirmation, cancellation
// and stock holds each declare their own permission below.
@PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).VIEW_NEW_ORDER)")
public class StaffSalesController {
    private final SalesOrderService service;
    private final OrderStateMachine stateMachine;

    public StaffSalesController(SalesOrderService service, OrderStateMachine stateMachine) {
        this.service = service;
        this.stateMachine = stateMachine;
    }

    @GetMapping("/orders")
    public ResponseEntity<?> allOrders() {
        return ResponseEntity.ok(service.getAllOrders());
    }

    @GetMapping("/orders/new")
    public ResponseEntity<?> newOrders() {
        return ResponseEntity.ok(service.getNewOrders());
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<?> orderDetail(@PathVariable Long id) {
        return ResponseEntity.ok(service.getOrder(id));
    }

    @GetMapping("/orders/{id}/notes")
    public ResponseEntity<?> orderNotes(@PathVariable Long id) {
        return ResponseEntity.ok(service.getOrderNotes(id));
    }

    @GetMapping("/orders/{id}/status-info")
    public ResponseEntity<?> orderStatusInfo(@PathVariable Long id) {
        return ResponseEntity.ok(service.getStatusInfo(id));
    }

    @GetMapping("/orders/{id}/transitions")
    public ResponseEntity<?> allowedTransitions(@PathVariable Long id) {
        return ResponseEntity.ok(service.getAllowedTransitions(id));
    }

    @GetMapping("/orders/{id}/history")
    public ResponseEntity<?> orderHistory(@PathVariable Long id) {
        return ResponseEntity.ok(service.getOrderStatusHistory(id));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).VERIFY_ORDER)")
    @PutMapping("/orders/{id}/verify")
    public ResponseEntity<?> verifyOrder(@PathVariable Long id, @RequestBody VerifyRequest request) {
        return ResponseEntity.ok(service.verifyOrder(
                id,
                request.customerName(),
                request.phone(),
                request.shippingAddress()
        ));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).VERIFY_ORDER)")
    @PostMapping("/orders")
    public ResponseEntity<?> createOrder(@RequestBody java.util.Map<String, Object> payload) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(service.createSalesOrder(payload));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).VERIFY_ORDER)")
    @PostMapping("/orders/{id}/confirm")
    public ResponseEntity<?> confirmOrder(@PathVariable Long id) {
        return ResponseEntity.ok(service.confirmOrder(id));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).VERIFY_ORDER)")
    @PostMapping("/orders/{id}/cancel")
    public ResponseEntity<?> cancelOrder(@PathVariable Long id, @RequestBody(required = false) CancelRequest request) {
        return ResponseEntity.ok(service.cancelOrder(id, request == null ? null : request.reason()));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).PROCESS_ORDER_NOTE)")
    @PostMapping("/orders/{id}/notes")
    public ResponseEntity<?> addNote(@PathVariable Long id, @RequestBody NoteRequest request) {
        return ResponseEntity.ok(service.addNote(id, request.content(), request.userId()));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).REQUEST_STOCK_HOLD)")
    @PostMapping("/orders/{id}/reservations")
    public ResponseEntity<?> requestReservation(@PathVariable Long id, @RequestBody ReservationRequest request) {
        return ResponseEntity.ok(service.requestReservation(id, request.productId(), request.quantity()));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MONITOR_ORDER_SLA)")
    @GetMapping("/sla")
    public ResponseEntity<?> slaWarnings() {
        return ResponseEntity.ok(service.getSlaWarningOrders());
    }

    @GetMapping("/statuses")
    public ResponseEntity<?> allStatuses() {
        return ResponseEntity.ok(stateMachine.getAllStatuses());
    }

    @GetMapping("/statuses/{status}/display")
    public ResponseEntity<?> statusDisplay(@PathVariable String status) {
        try {
            OrderStatus os = OrderStatus.valueOf(status.toUpperCase());
            return ResponseEntity.ok(new StatusDisplay(
                    os,
                    stateMachine.getStatusDisplayName(os),
                    stateMachine.getStatusColor(os)
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid status: " + status);
        }
    }

    public record VerifyRequest(String customerName, String phone, String shippingAddress) {}
    public record CancelRequest(String reason) {}
    public record NoteRequest(String content, String userId) {}
    public record ReservationRequest(Long productId, Integer quantity) {}
    public record StatusDisplay(OrderStatus status, String displayName, String colorClass) {}
}
