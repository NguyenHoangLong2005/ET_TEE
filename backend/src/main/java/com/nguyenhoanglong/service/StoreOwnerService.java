package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public interface StoreOwnerService {

    // 1. Product & Local Price Management
    PaginatedResponseDto<ShopProductDto> getShopProducts(Long shopId, int page, int size, String keyword, Long categoryId, String status);
    ShopProductDto getShopProductById(Long shopId, Long productId);
    ShopProductDto updateShopProductConfig(Long shopId, Long productId, ShopProductConfigUpdateDto updateDto);

    // 2. Approvals (Direct reading from Voucher & InventoryAdjustment)
    List<StoreApprovalItemDto> getPendingApprovals(Long shopId);
    StoreApprovalItemDto processVoucherApproval(Long shopId, Long voucherId, StoreApprovalActionDto actionDto, String actorIdOrEmail);
    StoreApprovalItemDto processInventoryAdjustmentApproval(Long shopId, Long adjustmentId, StoreApprovalActionDto actionDto, String actorIdOrEmail);
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

    // 6b. Orders list for shop
    PaginatedResponseDto<Map<String, Object>> getShopOrders(Long shopId, int page, int size, String status);

    // 7. Staff Management for Shop
    List<UserAdminDto> getShopStaff(Long shopId);
    UserAdminDto createShopStaff(Long shopId, UserCreateDto createDto, String actor);
    UserAdminDto updateShopStaffStatus(Long shopId, String staffId, UserStatusUpdateDto statusDto, String actor);
    ResetPasswordResponseDto resetShopStaffPassword(Long shopId, String staffId, String actor);
}
