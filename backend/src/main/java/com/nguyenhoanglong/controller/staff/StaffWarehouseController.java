package com.nguyenhoanglong.controller.staff;

import com.nguyenhoanglong.service.WarehouseService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/staff/warehouse")
// Class level only establishes "is a warehouse operator". Every mutating endpoint
// declares the specific permission it needs, so INBOUND_STOCK no longer silently
// grants stock adjustment, reservation approval, picking and handover.
@PreAuthorize("hasAnyAuthority(" +
        "T(com.nguyenhoanglong.constant.PermissionConstants).INBOUND_STOCK, " +
        "T(com.nguyenhoanglong.constant.PermissionConstants).COUNT_STOCK, " +
        "T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_STOCK_LOCATION, " +
        "T(com.nguyenhoanglong.constant.PermissionConstants).ADJUST_STOCK, " +
        "T(com.nguyenhoanglong.constant.PermissionConstants).HOLD_STOCK_ORDER, " +
        "T(com.nguyenhoanglong.constant.PermissionConstants).PICK_PACK_LABEL, " +
        "T(com.nguyenhoanglong.constant.PermissionConstants).HANDOVER_SHIPPING, " +
        "T(com.nguyenhoanglong.constant.PermissionConstants).PROPOSE_RESTOCK)")
public class StaffWarehouseController {
    private final WarehouseService service;

    public StaffWarehouseController(WarehouseService service) {
        this.service = service;
    }

    @GetMapping("/inventory")
    public ResponseEntity<?> inventory() {
        return ResponseEntity.ok(service.getInventory());
    }

    @GetMapping("/inventory/{id}")
    public ResponseEntity<?> inventoryDetail(@PathVariable UUID id) {
        return ResponseEntity.ok(service.inventory(id));
    }

    @GetMapping("/inventory/product/{variantId}")
    public ResponseEntity<?> inventoryByProduct(@PathVariable UUID variantId) {
        return ResponseEntity.ok(service.getInventoryByProduct(variantId));
    }

    // Don kho can xu ly: confirmed / picking / packed (order_status_transitions).
    @GetMapping("/orders")
    public ResponseEntity<?> orders() {
        return ResponseEntity.ok(service.getWarehouseOrders());
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).INBOUND_STOCK)")
    @PostMapping("/inbound")
    public ResponseEntity<?> inbound(@RequestBody InboundRequest request) {
        return ResponseEntity.ok(service.inbound(
                request.variantId(), request.quantity(), request.location()
        ));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).COUNT_STOCK)")
    @PostMapping("/inbound/{id}/count")
    public ResponseEntity<?> countInbound(@PathVariable UUID id, @RequestBody CountRequest request) {
        return ResponseEntity.ok(service.countInbound(id, request.actualQuantity()));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_STOCK_LOCATION)")
    @PutMapping("/inventory/{id}/location")
    public ResponseEntity<?> updateLocation(@PathVariable UUID id, @RequestBody LocationRequest request) {
        return ResponseEntity.ok(service.updateLocation(id, request.location()));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).ADJUST_STOCK)")
    @PostMapping("/inventory/{id}/adjustments")
    public ResponseEntity<?> createAdjustment(@PathVariable UUID id, @RequestBody AdjustmentRequest request) {
        return ResponseEntity.ok(service.createAdjustmentRequest(
                id, request.difference(), request.reason(), request.requestedBy()
        ));
    }

    @GetMapping("/adjustments")
    public ResponseEntity<?> adjustments() {
        return ResponseEntity.ok(service.getAdjustments());
    }

    // Segregation of duties: the operator who files an adjustment must not approve it.
    // Approval is a shop-owner power (see StoreOwnerController#approvals).
    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).APPROVE_SHOP_PROMO)")
    @PostMapping("/adjustments/{id}/approve")
    public ResponseEntity<?> approveAdjustment(@PathVariable Long id, @RequestBody ApprovalRequest request) {
        return ResponseEntity.ok(service.approveAdjustment(id, request.approvedBy()));
    }

    @GetMapping("/reservations")
    public ResponseEntity<?> reservations() {
        return ResponseEntity.ok(service.getPendingReservations());
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).HOLD_STOCK_ORDER)")
    @PostMapping("/reservations/{id}/approve")
    public ResponseEntity<?> approveReservation(@PathVariable Long id) {
        return ResponseEntity.ok(service.approveReservation(id));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).HOLD_STOCK_ORDER)")
    @PostMapping("/reservations/{id}/reject")
    public ResponseEntity<?> rejectReservation(@PathVariable Long id, @RequestBody RejectRequest request) {
        return ResponseEntity.ok(service.rejectReservation(id, request.reason()));
    }

<<<<<<< HEAD
    @GetMapping("/orders/{id}")
    public ResponseEntity<?> orderDetail(@PathVariable Long id) {
        return ResponseEntity.ok(service.order(id));
    }

    @GetMapping("/orders/{id}/picking")
=======
    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).PICK_PACK_LABEL)")
    @PostMapping("/orders/{id}/picking")
>>>>>>> main
    public ResponseEntity<?> startPicking(@PathVariable Long id) {
        return ResponseEntity.ok(service.startPicking(id));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).PICK_PACK_LABEL)")
    @PostMapping("/orders/{id}/picking/complete")
    public ResponseEntity<?> completePicking(@PathVariable Long id) {
        return ResponseEntity.ok(service.completePicking(id));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).PICK_PACK_LABEL)")
    @GetMapping("/orders/{id}/label")
    public ResponseEntity<?> labelInfo(@PathVariable Long id) {
        return ResponseEntity.ok(service.generateShippingLabel(id));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).PICK_PACK_LABEL)")
    @PostMapping("/orders/{id}/packing")
    public ResponseEntity<?> pack(@PathVariable Long id) {
        return ResponseEntity.ok(service.packOrder(id));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).PICK_PACK_LABEL)")
    @PostMapping("/orders/{id}/label")
    public ResponseEntity<?> label(@PathVariable Long id) {
        return ResponseEntity.ok(service.generateShippingLabel(id));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).HANDOVER_SHIPPING)")
    @PostMapping("/orders/{id}/handover")
    public ResponseEntity<?> handover(@PathVariable Long id) {
        return ResponseEntity.ok(service.readyToShip(id));
    }

    @GetMapping("/stocktakes")
    public ResponseEntity<?> stocktakes() {
        return ResponseEntity.ok(service.getStocktakes());
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).COUNT_STOCK)")
    @PostMapping("/stocktakes")
    public ResponseEntity<?> createStocktake(@RequestBody StocktakeRequest request) {
        return ResponseEntity.ok(service.createStocktake(request.warehouseLocation(), request.createdBy()));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).COUNT_STOCK)")
    @PutMapping("/stocktakes/{id}")
    public ResponseEntity<?> updateStocktake(@PathVariable Long id, @RequestBody StocktakeResultRequest request) {
        return ResponseEntity.ok(service.updateStocktake(id, request.actualQuantity()));
    }

    @GetMapping("/replenishment")
    public ResponseEntity<?> replenishment() {
        return ResponseEntity.ok(service.getReplenishmentSuggestions());
    }

    public record InboundRequest(UUID variantId, Integer quantity, String location) {}
    public record CountRequest(Integer actualQuantity) {}
    public record LocationRequest(String location) {}
    public record AdjustmentRequest(Integer difference, String reason, Long requestedBy) {}
    public record ApprovalRequest(Long approvedBy) {}
    public record RejectRequest(String reason) {}
    public record StocktakeRequest(String warehouseLocation, Long createdBy) {}
    public record StocktakeResultRequest(Integer actualQuantity) {}
}

