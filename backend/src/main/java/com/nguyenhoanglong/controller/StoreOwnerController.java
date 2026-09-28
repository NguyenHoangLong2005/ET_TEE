package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.service.CurrentUserService;
import com.nguyenhoanglong.service.StoreOwnerService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/store-owner")
public class StoreOwnerController {

    private final StoreOwnerService storeOwnerService;
    private final CurrentUserService currentUserService;

    public StoreOwnerController(StoreOwnerService storeOwnerService, CurrentUserService currentUserService) {
        this.storeOwnerService = storeOwnerService;
        this.currentUserService = currentUserService;
    }

    /**
     * Truoc day tu doc SecurityContext + tu tra UserRepository, va fallback
     * "return 1L" khi user khong co shopId - nghia la mot tai khoan lac chi
     * nhanh se mac dinh thao tac len chi nhanh 1. Thay bang
     * CurrentUserService.resolveShopIdForWrite(), khong co fallback nguy hiem
     * do (nem 403 thay vi doan chi nhanh).
     */
    private Long resolveShopId(Long paramShopId) {
        return currentUserService.resolveShopIdForWrite(paramShopId);
    }

    private String getActorIdOrEmail() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.isAuthenticated()) ? auth.getName() : "ADMIN";
    }

    // ==========================================
    // 1. PRODUCTS & LOCAL PRICE MANAGEMENT
    // ==========================================

    @GetMapping("/products")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<PaginatedResponseDto<ShopProductDto>>> getShopProducts(
            @RequestParam(required = false) Long shopId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String status) {

        Long targetShopId = resolveShopId(shopId);
        PaginatedResponseDto<ShopProductDto> result = storeOwnerService.getShopProducts(targetShopId, page, size, keyword, categoryId, status);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách sản phẩm chi nhánh thành công", result));
    }

    @GetMapping("/products/{productId}")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ShopProductDto>> getShopProductById(
            @RequestParam(required = false) Long shopId,
            @PathVariable Long productId) {

        Long targetShopId = resolveShopId(shopId);
        ShopProductDto dto = storeOwnerService.getShopProductById(targetShopId, productId);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết cấu hình sản phẩm thành công", dto));
    }

    @PutMapping("/products/{productId}/config")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ShopProductDto>> updateShopProductConfig(
            @RequestParam(required = false) Long shopId,
            @PathVariable Long productId,
            @Valid @RequestBody ShopProductConfigUpdateDto updateDto) {

        Long targetShopId = resolveShopId(shopId);
        ShopProductDto updated = storeOwnerService.updateShopProductConfig(targetShopId, productId, updateDto);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật cấu hình giá local và trạng thái bán thành công", updated));
    }

    // ==========================================
    // 2. APPROVALS (Direct reading from Voucher & Inventory)
    // ==========================================

    @GetMapping("/approvals/pending")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<StoreApprovalItemDto>>> getPendingApprovals(@RequestParam(required = false) Long shopId) {
        Long targetShopId = resolveShopId(shopId);
        List<StoreApprovalItemDto> list = storeOwnerService.getPendingApprovals(targetShopId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách mục chờ duyệt thành công", list));
    }

    @PutMapping("/approvals/vouchers/{voucherId}")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<StoreApprovalItemDto>> processVoucherApproval(
            @RequestParam(required = false) Long shopId,
            @PathVariable Long voucherId,
            @Valid @RequestBody StoreApprovalActionDto actionDto) {

        Long targetShopId = resolveShopId(shopId);
        String actor = getActorIdOrEmail();
        StoreApprovalItemDto result = storeOwnerService.processVoucherApproval(targetShopId, voucherId, actionDto, actor);
        return ResponseEntity.ok(ApiResponse.success("Xử lý phê duyệt Voucher thành công", result));
    }

    @PutMapping("/approvals/inventory-adjustments/{adjustmentId}")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<StoreApprovalItemDto>> processInventoryAdjustmentApproval(
            @RequestParam(required = false) Long shopId,
            @PathVariable Long adjustmentId,
            @Valid @RequestBody StoreApprovalActionDto actionDto) {

        Long targetShopId = resolveShopId(shopId);
        String actor = getActorIdOrEmail();
        StoreApprovalItemDto result = storeOwnerService.processInventoryAdjustmentApproval(targetShopId, adjustmentId, actionDto, actor);
        return ResponseEntity.ok(ApiResponse.success("Xử lý phê duyệt điều chỉnh tồn kho thành công", result));
    }

    @PutMapping("/approvals/{approvalId}")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<StoreApprovalItemDto>> processApprovalAction(
            @RequestParam(required = false) Long shopId,
            @PathVariable String approvalId,
            @Valid @RequestBody StoreApprovalActionDto actionDto) {

        Long targetShopId = resolveShopId(shopId);
        String actor = getActorIdOrEmail();
        StoreApprovalItemDto result = storeOwnerService.processApprovalAction(targetShopId, approvalId, actionDto, actor);
        return ResponseEntity.ok(ApiResponse.success("Xử lý phê duyệt thành công", result));
    }

    // ==========================================
    // 3. WORK SHIFTS
    // ==========================================

    @GetMapping("/work-shifts")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN', 'SALES_STAFF', 'WAREHOUSE_STAFF', 'CSKH_STAFF')")
    public ResponseEntity<ApiResponse<List<ShopWorkShiftDto>>> getWorkShifts(
            @RequestParam(required = false) Long shopId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String userId) {

        Long targetShopId = resolveShopId(shopId);
        List<ShopWorkShiftDto> shifts = storeOwnerService.getWorkShifts(targetShopId, startDate, endDate, userId);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch phân ca làm việc thành công", shifts));
    }

    @PostMapping("/work-shifts")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ShopWorkShiftDto>> createWorkShift(
            @RequestParam(required = false) Long shopId,
            @Valid @RequestBody ShopWorkShiftCreateDto createDto) {

        Long targetShopId = resolveShopId(shopId);
        ShopWorkShiftDto created = storeOwnerService.createWorkShift(targetShopId, createDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Phân ca làm việc mới thành công", created));
    }

    @PutMapping("/work-shifts/{shiftId}")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ShopWorkShiftDto>> updateWorkShift(
            @RequestParam(required = false) Long shopId,
            @PathVariable Long shiftId,
            @Valid @RequestBody ShopWorkShiftCreateDto updateDto) {

        Long targetShopId = resolveShopId(shopId);
        ShopWorkShiftDto updated = storeOwnerService.updateWorkShift(targetShopId, shiftId, updateDto);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật ca làm việc thành công", updated));
    }

    @DeleteMapping("/work-shifts/{shiftId}")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteWorkShift(
            @RequestParam(required = false) Long shopId,
            @PathVariable Long shiftId) {

        Long targetShopId = resolveShopId(shopId);
        storeOwnerService.deleteWorkShift(targetShopId, shiftId);
        return ResponseEntity.ok(ApiResponse.success("Xóa ca làm việc thành công", null));
    }

    // ==========================================
    // 4. STAFF PERFORMANCE EVALUATIONS
    // ==========================================

    @GetMapping("/evaluations")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<StaffPerformanceEvaluationDto>>> getEvaluations(
            @RequestParam(required = false) Long shopId,
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String userId) {

        Long targetShopId = resolveShopId(shopId);
        List<StaffPerformanceEvaluationDto> evals = storeOwnerService.getEvaluations(targetShopId, period, userId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đánh giá hiệu suất nhân sự thành công", evals));
    }

    @PostMapping("/evaluations")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<StaffPerformanceEvaluationDto>> createEvaluation(
            @RequestParam(required = false) Long shopId,
            @Valid @RequestBody StaffPerformanceEvaluationCreateDto createDto) {

        Long targetShopId = resolveShopId(shopId);
        String actor = getActorIdOrEmail();
        StaffPerformanceEvaluationDto created = storeOwnerService.createEvaluation(targetShopId, createDto, actor);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Lưu đánh giá hiệu suất nhân sự thành công", created));
    }

    // ==========================================
    // 5. SHOP AUDIT LOGS
    // ==========================================

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<PaginatedResponseDto<ShopAuditLogDto>>> getShopAuditLogs(
            @RequestParam(required = false) Long shopId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String userId) {

        Long targetShopId = resolveShopId(shopId);
        PaginatedResponseDto<ShopAuditLogDto> result = storeOwnerService.getShopAuditLogs(targetShopId, page, size, action, startDate, endDate, userId);
        return ResponseEntity.ok(ApiResponse.success("Lấy nhật ký hoạt động shop thành công", result));
    }

    // 6. Orders list for shop
    @GetMapping("/orders")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<PaginatedResponseDto<Map<String, Object>>>> getShopOrders(
            @RequestParam(required = false) Long shopId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {

        Long targetShopId = resolveShopId(shopId);
        PaginatedResponseDto<Map<String, Object>> result = storeOwnerService.getShopOrders(targetShopId, page, size, status);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn hàng chi nhánh thành công", result));
    }

    // Dashboard Metrics - REAL data from database
    @GetMapping({"/dashboard", "/dashboard/metrics"})
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardMetrics(
            @RequestParam(required = false) Long shopId) {

        Long targetShopId = resolveShopId(shopId);
        Map<String, Object> metrics = storeOwnerService.getShopDashboardMetrics(targetShopId);
        return ResponseEntity.ok(ApiResponse.success("Lấy chỉ số tổng quan shop thành công", metrics));
    }

    // ==========================================
    // 7. STAFF MANAGEMENT FOR SHOP
    // ==========================================

    @GetMapping("/staff")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<UserAdminDto>>> getShopStaff(@RequestParam(required = false) Long shopId) {
        Long targetShopId = resolveShopId(shopId);
        List<UserAdminDto> staffList = storeOwnerService.getShopStaff(targetShopId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách nhân viên chi nhánh thành công", staffList));
    }

    @PostMapping("/staff")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<UserAdminDto>> createShopStaff(
            @RequestParam(required = false) Long shopId,
            @Valid @RequestBody UserCreateDto createDto) {
        Long targetShopId = resolveShopId(shopId);
        createDto.setShopId(targetShopId);
        String actor = getActorIdOrEmail();
        UserAdminDto created = storeOwnerService.createShopStaff(targetShopId, createDto, actor);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Tạo nhân viên chi nhánh thành công", created));
    }

    @PatchMapping("/staff/{staffId}/status")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<UserAdminDto>> updateShopStaffStatus(
            @RequestParam(required = false) Long shopId,
            @PathVariable String staffId,
            @Valid @RequestBody UserStatusUpdateDto statusDto) {
        Long targetShopId = resolveShopId(shopId);
        String actor = getActorIdOrEmail();
        UserAdminDto updated = storeOwnerService.updateShopStaffStatus(targetShopId, staffId, statusDto, actor);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái nhân viên thành công", updated));
    }

    @PostMapping("/staff/{staffId}/reset-password")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ResetPasswordResponseDto>> resetShopStaffPassword(
            @RequestParam(required = false) Long shopId,
            @PathVariable String staffId) {
        Long targetShopId = resolveShopId(shopId);
        String actor = getActorIdOrEmail();
        ResetPasswordResponseDto result = storeOwnerService.resetShopStaffPassword(targetShopId, staffId, actor);
        return ResponseEntity.ok(ApiResponse.success("Cấp mật khẩu tạm thời thành công", result));
    }
}
