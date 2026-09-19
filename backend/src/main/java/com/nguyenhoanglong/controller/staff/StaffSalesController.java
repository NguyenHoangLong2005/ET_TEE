package com.nguyenhoanglong.controller.staff;

import com.nguyenhoanglong.service.SalesOrderService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

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
    public ResponseEntity<?> orderDetail(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getOrder(id));
    }

    @GetMapping("/orders/{id}/notes")
    public ResponseEntity<?> orderNotes(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getOrderNotes(id));
    }

    @PutMapping("/orders/{id}/verify")
    public ResponseEntity<?> verifyOrder(@PathVariable UUID id, @RequestBody VerifyRequest request) {
        return ResponseEntity.ok(service.verifyOrder(
                id,
                request.customerName(),
                request.phone(),
                request.shippingAddress()
        ));
    }

    @PostMapping("/orders/{id}/confirm")
    public ResponseEntity<?> confirmOrder(@PathVariable UUID id) {
        return ResponseEntity.ok(service.confirmOrder(id));
    }

    @PostMapping("/orders/{id}/cancel")
    public ResponseEntity<?> cancelOrder(@PathVariable UUID id, @RequestBody(required = false) CancelRequest request) {
        return ResponseEntity.ok(service.cancelOrder(id, request == null ? null : request.reason()));
    }

    @PostMapping("/orders/{id}/notes")
    public ResponseEntity<?> addNote(@PathVariable UUID id, @RequestBody NoteRequest request) {
        return ResponseEntity.ok(service.addNote(id, request.content(), request.userId()));
    }

    @PostMapping("/orders/{id}/reservations")
    public ResponseEntity<?> requestReservation(@PathVariable UUID id, @RequestBody ReservationRequest request) {
        return ResponseEntity.ok(service.requestReservation(id, request.productId(), request.quantity()));
    }

    @GetMapping("/sla")
    public ResponseEntity<?> slaWarnings() {
        return ResponseEntity.ok(service.getNewOrders());
    }

    public record VerifyRequest(String customerName, String phone, String shippingAddress) {}
    public record CancelRequest(String reason) {}
    public record NoteRequest(String content, UUID userId) {}
    public record ReservationRequest(UUID productId, Integer quantity) {}
}
