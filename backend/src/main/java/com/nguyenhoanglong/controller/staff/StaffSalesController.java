package com.nguyenhoanglong.controller.staff;

import com.nguyenhoanglong.service.SalesOrderService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/staff/sales")
public class StaffSalesController {
    private final SalesOrderService service;

    public StaffSalesController(SalesOrderService service) {
        this.service = service;
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

    @PutMapping("/orders/{id}/verify")
    public ResponseEntity<?> verifyOrder(@PathVariable Long id, @RequestBody VerifyRequest request) {
        return ResponseEntity.ok(service.verifyOrder(
                id,
                request.customerName(),
                request.phone(),
                request.shippingAddress()
        ));
    }

    @PostMapping("/orders/{id}/confirm")
    public ResponseEntity<?> confirmOrder(@PathVariable Long id) {
        return ResponseEntity.ok(service.confirmOrder(id));
    }

    @PostMapping("/orders/{id}/cancel")
    public ResponseEntity<?> cancelOrder(@PathVariable Long id, @RequestBody(required = false) CancelRequest request) {
        return ResponseEntity.ok(service.cancelOrder(id, request == null ? null : request.reason()));
    }

    @PostMapping("/orders/{id}/notes")
    public ResponseEntity<?> addNote(@PathVariable Long id, @RequestBody NoteRequest request) {
        return ResponseEntity.ok(service.addNote(id, request.content(), request.userId()));
    }

    @PostMapping("/orders/{id}/reservations")
    public ResponseEntity<?> requestReservation(@PathVariable Long id, @RequestBody ReservationRequest request) {
        return ResponseEntity.ok(service.requestReservation(id, request.productId(), request.quantity()));
    }

    @GetMapping("/sla")
    public ResponseEntity<?> slaWarnings() {
        return ResponseEntity.ok(service.getSlaWarningOrders());
    }

    public record VerifyRequest(String customerName, String phone, String shippingAddress) {}
    public record CancelRequest(String reason) {}
    public record NoteRequest(String content, Long userId) {}
    public record ReservationRequest(Long productId, Integer quantity) {}
}
