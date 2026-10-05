package com.nguyenhoanglong.controller.staff;

import com.nguyenhoanglong.service.WarehouseService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

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

    // Đơn kho cần xử lý: confirmed / picking / packed (order_status_transitions).
    @GetMapping("/orders")
    public ResponseEntity<?> orders() {
        return ResponseEntity.ok(service.getWarehouseOrders());
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).INBOUND_STOCK)")
    @PostMapping("/inbound")
    public ResponseEntity<?> inbound(@RequestBody InboundRequest request) {
        return ResponseEntity.ok(service.inbound(
                request.productId(), request.productName(), request.quantity(), request.location(),
                request.supplierId(), request.note(), request.variantId()
        ));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).INBOUND_STOCK)")
    @GetMapping("/products/{productId}/variants")
    public ResponseEntity<?> productVariants(@PathVariable Long productId) {
        return ResponseEntity.ok(service.getProductVariants(productId));
    }

    // Danh mục sản phẩm để chọn khi nhập kho (gồm cả sản phẩm chưa có dòng tồn kho).
    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).INBOUND_STOCK)")
    @GetMapping("/products")
    public ResponseEntity<?> catalogProducts() {
        return ResponseEntity.ok(service.getCatalogProducts());
    }

    // Lịch sử phiếu nhập kho (mới nhất trước).
    @GetMapping("/inbound")
    public ResponseEntity<?> inboundHistory() {
        return ResponseEntity.ok(service.getReceipts());
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).COUNT_STOCK)")
    @PostMapping("/inbound/{id}/count")
    public ResponseEntity<?> countInbound(@PathVariable Long id, @RequestBody CountRequest request) {
        return ResponseEntity.ok(service.countInbound(id, request.actualQuantity()));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_STOCK_LOCATION)")
    @PutMapping("/inventory/{id}/location")
    public ResponseEntity<?> updateLocation(@PathVariable Long id, @RequestBody LocationRequest request) {
        return ResponseEntity.ok(service.updateLocation(id, request.location()));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).ADJUST_STOCK)")
    @PostMapping("/inventory/{id}/adjustments")
    public ResponseEntity<?> createAdjustment(@PathVariable Long id, @RequestBody AdjustmentRequest request) {
        return ResponseEntity.ok(service.createAdjustmentRequest(
                id, request.difference(), request.reason()
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
    public ResponseEntity<?> approveAdjustment(@PathVariable Long id) {
        return ResponseEntity.ok(service.approveAdjustment(id));
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

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).PICK_PACK_LABEL)")
    @PostMapping("/orders/{id}/picking")
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

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).PROPOSE_RESTOCK)")
    @PostMapping("/replenishment")
    public ResponseEntity<?> proposeRestock(@RequestBody RestockRequestBody request) {
        return ResponseEntity.ok(service.createRestockRequest(request.inventoryId(), request.quantity(), request.note()));
    }

    @GetMapping("/replenishment/requests")
    public ResponseEntity<?> restockRequests() {
        return ResponseEntity.ok(service.getRestockRequests());
    }

    public record InboundRequest(Long productId, String productName, Integer quantity, String location,
                                 Long supplierId, String note, Long variantId) {}
    public record RestockRequestBody(Long inventoryId, Integer quantity, String note) {}
    public record CountRequest(Integer actualQuantity) {}
    public record LocationRequest(String location) {}
    public record AdjustmentRequest(Integer difference, String reason) {}
    public record RejectRequest(String reason) {}
    public record StocktakeRequest(String warehouseLocation, Long createdBy) {}
    public record StocktakeResultRequest(Integer actualQuantity) {}
}

