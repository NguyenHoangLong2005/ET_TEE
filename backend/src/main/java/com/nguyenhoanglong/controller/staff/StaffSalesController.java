package com.nguyenhoanglong.controller.staff;

import com.nguyenhoanglong.dto.ApiResponse;
import com.nguyenhoanglong.entity.Order;
import com.nguyenhoanglong.entity.OrderNote;
import com.nguyenhoanglong.entity.StockReservation;
import com.nguyenhoanglong.service.SalesOrderService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/staff/sales")
public class StaffSalesController {
    private final SalesOrderService service;

    public StaffSalesController(SalesOrderService service) {
        this.service = service;
    }

    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<List<Order>>> allOrders() {
        return ResponseEntity.ok(ApiResponse.success(service.getAllOrders()));
    }

    @GetMapping("/orders/new")
    public ResponseEntity<ApiResponse<List<Order>>> newOrders() {
        return ResponseEntity.ok(ApiResponse.success(service.getNewOrders()));
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<ApiResponse<Order>> orderDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(service.getOrder(id)));
    }

    @GetMapping("/orders/{id}/notes")
    public ResponseEntity<ApiResponse<List<OrderNote>>> orderNotes(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(service.getOrderNotes(id)));
    }

    @PutMapping("/orders/{id}/verify")
    public ResponseEntity<ApiResponse<Order>> verifyOrder(@PathVariable Long id, @RequestBody VerifyRequest request) {
        return ResponseEntity.ok(ApiResponse.success(service.verifyOrder(
                id,
                request.customerName(),
                request.phone(),
                request.shippingAddress()
        )));
    }

    @PostMapping("/orders/{id}/confirm")
    public ResponseEntity<ApiResponse<Order>> confirmOrder(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(service.confirmOrder(id)));
    }

    @PostMapping("/orders/{id}/cancel")
    public ResponseEntity<ApiResponse<Order>> cancelOrder(@PathVariable Long id, @RequestBody(required = false) CancelRequest request) {
        return ResponseEntity.ok(ApiResponse.success(service.cancelOrder(id, request == null ? null : request.reason())));
    }

    @PostMapping("/orders/{id}/notes")
    public ResponseEntity<ApiResponse<OrderNote>> addNote(@PathVariable Long id, @RequestBody NoteRequest request) {
        return ResponseEntity.ok(ApiResponse.success(service.addNote(id, request.content(), request.userId())));
    }

    @PostMapping("/orders/{id}/reservations")
    public ResponseEntity<ApiResponse<StockReservation>> requestReservation(@PathVariable Long id, @RequestBody ReservationRequest request) {
        return ResponseEntity.ok(ApiResponse.success(service.requestReservation(id, request.productId(), request.quantity())));
    }

    @GetMapping("/sla")
    public ResponseEntity<ApiResponse<List<Order>>> slaWarnings() {
        return ResponseEntity.ok(ApiResponse.success(service.getNewOrders()));
    }

    public record VerifyRequest(String customerName, String phone, String shippingAddress) {}
    public record CancelRequest(String reason) {}
    public record NoteRequest(String content, Long userId) {}
    public record ReservationRequest(Long productId, Integer quantity) {}
}
