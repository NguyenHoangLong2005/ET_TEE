package com.nguyenhoanglong.controller.staff;

import com.nguyenhoanglong.service.ShippingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/staff/shipping")
public class StaffShippingController {
    private final ShippingService service;

    public StaffShippingController(ShippingService service) {
        this.service = service;
    }

    @GetMapping("/ready-orders")
    public ResponseEntity<?> readyOrders() {
        return ResponseEntity.ok(service.getReadyOrders());
    }

    // Alias cho frontend trang "Đơn cần xử lý vận chuyển".
    @GetMapping("/orders")
    public ResponseEntity<?> readyOrdersAlias() {
        return ResponseEntity.ok(service.getReadyOrders());
    }

    @GetMapping("/shipments")
    public ResponseEntity<?> shipments() {
        return ResponseEntity.ok(service.getAllShipments());
    }

    @GetMapping("/shipments/{id}")
    public ResponseEntity<?> shipment(@PathVariable Long id) {
        return ResponseEntity.ok(service.getShipment(id));
    }

    @PostMapping("/shipments")
    public ResponseEntity<?> createShipment(@RequestBody ShipmentRequest request) {
        return ResponseEntity.ok(service.createShipment(
                request.orderId(), request.carrierName(), request.trackingCode(), request.codAmount()
        ));
    }

    @PutMapping("/shipments/{id}/tracking-code")
    public ResponseEntity<?> updateTrackingCode(@PathVariable Long id, @RequestBody TrackingRequest request) {
        return ResponseEntity.ok(service.updateTrackingCode(id, request.trackingCode()));
    }

    @PostMapping("/shipments/{id}/handover")
    public ResponseEntity<?> handover(@PathVariable Long id) {
        return ResponseEntity.ok(service.handover(id));
    }

    @PostMapping("/shipments/{id}/shipping")
    public ResponseEntity<?> startShipping(@PathVariable Long id) {
        return ResponseEntity.ok(service.startShipping(id));
    }

    @GetMapping("/exceptions")
    public ResponseEntity<?> exceptions() {
        return ResponseEntity.ok(service.getExceptions());
    }

    @PostMapping("/exceptions")
    public ResponseEntity<?> createException(@RequestBody ExceptionRequest request) {
        return ResponseEntity.ok(service.addException(
                request.shipmentId(), request.type(), request.description()
        ));
    }

    @PutMapping("/exceptions/{id}/resolve")
    public ResponseEntity<?> resolveException(@PathVariable Long id, @RequestBody ResolveRequest request) {
        return ResponseEntity.ok(service.resolveException(id, request.note()));
    }

    @PostMapping("/shipments/{id}/proof")
    public ResponseEntity<?> proofOfDelivery(@PathVariable Long id, @RequestBody ProofRequest request) {
        return ResponseEntity.ok(service.delivered(
                id, request.receiverName(), request.imageUrl(), request.note()
        ));
    }

    @GetMapping("/cod")
    public ResponseEntity<?> pendingCod() {
        return ResponseEntity.ok(service.getPendingCod());
    }

    @PostMapping("/cod/{id}/reconcile")
    public ResponseEntity<?> reconcileCod(@PathVariable Long id) {
        return ResponseEntity.ok(service.reconcileCod(id));
    }

    public record ShipmentRequest(Long orderId, String carrierName, String trackingCode, BigDecimal codAmount) {}
    public record TrackingRequest(String trackingCode) {}
    public record ExceptionRequest(Long shipmentId, String type, String description) {}
    public record ResolveRequest(String note) {}
    public record ProofRequest(String receiverName, String imageUrl, String note) {}
}
