package com.nguyenhoanglong.controller.staff;

import com.nguyenhoanglong.dto.CreateCodReconciliationDto;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.UserRepository;
import com.nguyenhoanglong.service.ShippingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/staff/shipping")
// Class level grants waybill access only. Handover confirmation, exception
// handling, proof of delivery and COD reconciliation are separate powers.
@PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_WAYBILL)")
public class StaffShippingController {
    private final ShippingService service;
    private final UserRepository userRepository;

    public StaffShippingController(ShippingService service, UserRepository userRepository) {
        this.service = service;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName().equals("anonymousUser")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        }
        String name = auth.getName();
        return userRepository.findByEmail(name)
                .orElseGet(() -> userRepository.findById(name)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không tìm thấy người dùng")));
    }

    @GetMapping("/ready-orders")
    public ResponseEntity<?> readyOrders() {
        User actor = getCurrentUser();
        return ResponseEntity.ok(service.getReadyOrders(actor));
    }

    // Alias cho frontend trang "Đơn cần xử lý vận chuyển".
    @GetMapping("/orders")
    public ResponseEntity<?> readyOrdersAlias() {
        User actor = getCurrentUser();
        return ResponseEntity.ok(service.getReadyOrders(actor));
    }

    @GetMapping("/shipments")
    public ResponseEntity<?> shipments() {
        User actor = getCurrentUser();
        return ResponseEntity.ok(service.getAllShipments(actor));
    }

    @GetMapping("/shipments/{id}")
    public ResponseEntity<?> shipment(@PathVariable Long id) {
        User actor = getCurrentUser();
        return ResponseEntity.ok(service.getShipment(actor, id));
    }

    @PostMapping("/shipments")
    public ResponseEntity<?> createShipment(@RequestBody ShipmentRequest request) {
        User actor = getCurrentUser();
        return ResponseEntity.ok(service.createShipment(
                actor, request.orderId(), request.carrierName(), request.trackingCode(), request.codAmount()
        ));
    }

    @PutMapping("/shipments/{id}/tracking-code")
    public ResponseEntity<?> updateTrackingCode(@PathVariable Long id, @RequestBody TrackingRequest request) {
        User actor = getCurrentUser();
        return ResponseEntity.ok(service.updateTrackingCode(actor, id, request.trackingCode()));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).CONFIRM_HANDOVER)")
    @PostMapping("/shipments/{id}/handover")
    public ResponseEntity<?> handover(@PathVariable Long id) {
        User actor = getCurrentUser();
        return ResponseEntity.ok(service.handover(actor, id));
    }

    @PostMapping("/shipments/{id}/shipping")
    public ResponseEntity<?> startShipping(@PathVariable Long id) {
        User actor = getCurrentUser();
        return ResponseEntity.ok(service.startShipping(actor, id));
    }

    @GetMapping("/exceptions")
    public ResponseEntity<?> exceptions() {
        User actor = getCurrentUser();
        return ResponseEntity.ok(service.getExceptions(actor));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).UPDATE_SHIPPING_EXCEPTION)")
    @PostMapping("/exceptions")
    public ResponseEntity<?> createException(@RequestBody ExceptionRequest request) {
        User actor = getCurrentUser();
        return ResponseEntity.ok(service.addException(
                actor, request.shipmentId(), request.type(), request.description()
        ));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).UPDATE_SHIPPING_EXCEPTION)")
    @PutMapping("/exceptions/{id}/resolve")
    public ResponseEntity<?> resolveException(@PathVariable Long id, @RequestBody ResolveRequest request) {
        User actor = getCurrentUser();
        return ResponseEntity.ok(service.resolveException(actor, id, request.note()));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).UPLOAD_POD)")
    @PostMapping("/shipments/{id}/proof")
    public ResponseEntity<?> proofOfDelivery(@PathVariable Long id, @RequestBody ProofRequest request) {
        User actor = getCurrentUser();
        return ResponseEntity.ok(service.delivered(
                actor, id, request.receiverName(), request.imageUrl(), request.note()
        ));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).RECONCILE_COD)")
    @GetMapping("/cod")
    public ResponseEntity<?> pendingCod() {
        User actor = getCurrentUser();
        return ResponseEntity.ok(service.getPendingCod(actor));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).RECONCILE_COD)")
    @PostMapping("/cod/{id}/reconcile")
    public ResponseEntity<?> reconcileCod(@PathVariable Long id) {
        User actor = getCurrentUser();
        return ResponseEntity.ok(service.reconcileCod(actor, id));
    }

    // New COD Reconciliation Endpoints
    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).RECONCILE_COD)")
    @PostMapping("/cod/reconciliation")
    public ResponseEntity<?> createCodReconciliation(@Valid @RequestBody CreateCodReconciliationDto dto) {
        User actor = getCurrentUser();
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createCodReconciliation(actor, dto));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).RECONCILE_COD)")
    @GetMapping("/cod/reconciliations")
    public ResponseEntity<?> getCodReconciliations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        User actor = getCurrentUser();
        return ResponseEntity.ok(service.getCodReconciliations(actor, page, size));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).RECONCILE_COD)")
    @GetMapping("/cod/reconciliations/{id}")
    public ResponseEntity<?> getCodReconciliationDetail(@PathVariable Long id) {
        User actor = getCurrentUser();
        return ResponseEntity.ok(service.getCodReconciliationDetail(actor, id));
    }

    public record ShipmentRequest(Long orderId, String carrierName, String trackingCode, BigDecimal codAmount) {}
    public record TrackingRequest(String trackingCode) {}
    public record ExceptionRequest(Long shipmentId, String type, String description) {}
    public record ResolveRequest(String note) {}
    public record ProofRequest(String receiverName, String imageUrl, String note) {}
}

