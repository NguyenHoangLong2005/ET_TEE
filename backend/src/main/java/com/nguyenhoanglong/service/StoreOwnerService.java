package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public interface StoreOwnerService {

    // 1. Product prices and selling state. One price for the whole system: an edit changes the product,
    //    all its variants and therefore the storefront, cart and checkout.
    PaginatedResponseDto<ShopProductDto> getShopProducts(Long shopId, int page, int size, String keyword, Long categoryId, String status);
    ShopProductDto getShopProductById(Long shopId, Long productId);

    /** Sets list price, promotional price and on/off-sale state of one product (system-wide). */
    ShopProductDto updateProductPricing(Long productId, ProductPriceUpdateDto updateDto);

    /** Full product record for the edit form (works for inactive products too). */
    StoreProductFormDto getProductForm(Long productId);

    StoreProductFormDto createProduct(StoreProductFormDto form);

    /** Updates product info and images. Variants and stock are left untouched. */
    StoreProductFormDto updateProduct(Long productId, StoreProductFormDto form);

    /** {canDelete, reason, openOrderCount}: a product in an unfinished order cannot be deleted. */
    Map<String, Object> checkProductDelete(Long productId);

    void deleteProduct(Long productId);

    /** ACTIVATE | DEACTIVATE | CLEAR_SALE on many products. Returns how many products were changed. */
    int bulkProductAction(java.util.List<Long> productIds, String action);

    // 2. Approvals (Direct reading from Voucher & InventoryAdjustment)
    List<StoreApprovalItemDto> getPendingApprovals(Long shopId);
    StoreApprovalItemDto processVoucherApproval(Long shopId, Long voucherId, StoreApprovalActionDto actionDto, String actorIdOrEmail);
    StoreApprovalItemDto processInventoryAdjustmentApproval(Long shopId, Long adjustmentId, StoreApprovalActionDto actionDto, String actorIdOrEmail);
    StoreApprovalItemDto processRestockApproval(Long shopId, Long requestId, StoreApprovalActionDto actionDto, String actorIdOrEmail);
    StoreApprovalItemDto processApprovalAction(Long shopId, String approvalId, StoreApprovalActionDto actionDto, String actorIdOrEmail);

    // 3. Work Shift Management
    List<ShopWorkShiftDto> getWorkShifts(Long shopId, LocalDate startDate, LocalDate endDate, String userId);
    ShopWorkShiftDto createWorkShift(Long shopId, ShopWorkShiftCreateDto createDto);
    ShopWorkShiftDto updateWorkShift(Long shopId, Long shiftId, ShopWorkShiftCreateDto updateDto);
    void deleteWorkShift(Long shopId, Long shiftId);

    // 4. Staff Performance Evaluations
    List<StaffPerformanceEvaluationDto> getEvaluations(Long shopId, String period, String userId);
    StaffPerformanceEvaluationDto createEvaluation(Long shopId, StaffPerformanceEvaluationCreateDto createDto, String evaluatedBy);

    // 5. Audit Log Reading for Shop
    PaginatedResponseDto<ShopAuditLogDto> getShopAuditLogs(Long shopId, int page, int size, String action, String startDate, String endDate, String userId);
    
    // 6. Dashboard Metrics
    Map<String, Object> getShopDashboardMetrics(Long shopId);

    /**
     * Dashboard limited to orders created between {@code from} and {@code to} (both inclusive).
     * Order counts, revenue and the chart follow that range, and revenueChange compares it with the
     * range of the same length right before it. Inventory / staff / approvals are not time based.
     */
    Map<String, Object> getShopDashboardMetrics(Long shopId, java.time.LocalDate from, java.time.LocalDate to);

    // 6b. Orders list for shop
    PaginatedResponseDto<Map<String, Object>> getShopOrders(Long shopId, int page, int size, String status);

    /** Orders of the branch filtered by status, free-text search (code / customer / phone) and creation date range. */
    PaginatedResponseDto<Map<String, Object>> getShopOrders(Long shopId, int page, int size, String status,
                                                            String search, java.time.LocalDate from, java.time.LocalDate to);

    /** One order of the branch with its items, addresses, payment and status history. */
    Map<String, Object> getShopOrderDetail(Long shopId, Long orderId);

    // 7. Staff Management for Shop
    List<UserAdminDto> getShopStaff(Long shopId);
    UserAdminDto createShopStaff(Long shopId, UserCreateDto createDto, String actor);
    UserAdminDto updateShopStaffStatus(Long shopId, String staffId, UserStatusUpdateDto statusDto, String actor);
    ResetPasswordResponseDto resetShopStaffPassword(Long shopId, String staffId, String actor);
}
