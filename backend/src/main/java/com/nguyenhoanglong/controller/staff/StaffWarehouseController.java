package com.nguyenhoanglong.controller.staff;

import com.nguyenhoanglong.service.WarehouseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/staff/warehouse")
public class StaffWarehouseController {
    private final WarehouseService service;

    public StaffWarehouseController(WarehouseService service) {
        this.service = service;
    }

    @GetMapping("/inventory")
    public ResponseEntity<?> inventory() {
        return ResponseEntity.ok(service.getInventory());
    }

    // Đơn kho cần xử lý: confirmed / picking / packed (order_status_transitions).
    @GetMapping("/orders")
    public ResponseEntity<?> orders() {
        return ResponseEntity.ok(service.getWarehouseOrders());
    }

    @PostMapping("/inbound")
    public ResponseEntity<?> inbound(@RequestBody InboundRequest request) {
        return ResponseEntity.ok(service.inbound(
                request.productId(), request.productName(), request.quantity(), request.location()
        ));
    }

    @PostMapping("/inbound/{id}/count")
    public ResponseEntity<?> countInbound(@PathVariable Long id, @RequestBody CountRequest request) {
        return ResponseEntity.ok(service.countInbound(id, request.actualQuantity()));
    }

    @PutMapping("/inventory/{id}/location")
    public ResponseEntity<?> updateLocation(@PathVariable Long id, @RequestBody LocationRequest request) {
        return ResponseEntity.ok(service.updateLocation(id, request.location()));
    }

    @PostMapping("/inventory/{id}/adjustments")
    public ResponseEntity<?> createAdjustment(@PathVariable Long id, @RequestBody AdjustmentRequest request) {
        return ResponseEntity.ok(service.createAdjustmentRequest(
                id, request.difference(), request.reason(), request.requestedBy()
        ));
    }

    @GetMapping("/adjustments")
    public ResponseEntity<?> adjustments() {
        return ResponseEntity.ok(service.getAdjustments());
    }

    @PostMapping("/adjustments/{id}/approve")
    public ResponseEntity<?> approveAdjustment(@PathVariable Long id, @RequestBody ApprovalRequest request) {
        return ResponseEntity.ok(service.approveAdjustment(id, request.approvedBy()));
    }

    @GetMapping("/reservations")
    public ResponseEntity<?> reservations() {
        return ResponseEntity.ok(service.getPendingReservations());
    }

    @PostMapping("/reservations/{id}/approve")
    public ResponseEntity<?> approveReservation(@PathVariable Long id) {
        return ResponseEntity.ok(service.approveReservation(id));
    }

    @PostMapping("/reservations/{id}/reject")
    public ResponseEntity<?> rejectReservation(@PathVariable Long id, @RequestBody RejectRequest request) {
        return ResponseEntity.ok(service.rejectReservation(id, request.reason()));
    }

    @PostMapping("/orders/{id}/picking")
    public ResponseEntity<?> startPicking(@PathVariable Long id) {
        return ResponseEntity.ok(service.startPicking(id));
    }

    @PostMapping("/orders/{id}/picking/complete")
    public ResponseEntity<?> completePicking(@PathVariable Long id) {
        return ResponseEntity.ok(service.completePicking(id));
    }

    @GetMapping("/orders/{id}/label")
    public ResponseEntity<?> labelInfo(@PathVariable Long id) {
        return ResponseEntity.ok(service.generateShippingLabel(id));
    }

    @PostMapping("/orders/{id}/packing")
    public ResponseEntity<?> pack(@PathVariable Long id) {
        return ResponseEntity.ok(service.packOrder(id));
    }

    @PostMapping("/orders/{id}/label")
    public ResponseEntity<?> label(@PathVariable Long id) {
        return ResponseEntity.ok(service.generateShippingLabel(id));
    }

    @PostMapping("/orders/{id}/handover")
    public ResponseEntity<?> handover(@PathVariable Long id) {
        return ResponseEntity.ok(service.readyToShip(id));
    }

    @GetMapping("/stocktakes")
    public ResponseEntity<?> stocktakes() {
        return ResponseEntity.ok(service.getStocktakes());
    }

    @PostMapping("/stocktakes")
    public ResponseEntity<?> createStocktake(@RequestBody StocktakeRequest request) {
        return ResponseEntity.ok(service.createStocktake(request.warehouseLocation(), request.createdBy()));
    }

    @PutMapping("/stocktakes/{id}")
    public ResponseEntity<?> updateStocktake(@PathVariable Long id, @RequestBody StocktakeResultRequest request) {
        return ResponseEntity.ok(service.updateStocktake(id, request.actualQuantity()));
    }

    @GetMapping("/replenishment")
    public ResponseEntity<?> replenishment() {
        return ResponseEntity.ok(service.getReplenishmentSuggestions());
    }

    public record InboundRequest(Long productId, String productName, Integer quantity, String location) {}
    public record CountRequest(Integer actualQuantity) {}
    public record LocationRequest(String location) {}
    public record AdjustmentRequest(Integer difference, String reason, Long requestedBy) {}
    public record ApprovalRequest(Long approvedBy) {}
    public record RejectRequest(String reason) {}
    public record StocktakeRequest(String warehouseLocation, Long createdBy) {}
    public record StocktakeResultRequest(Integer actualQuantity) {}
}
