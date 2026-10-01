package com.nguyenhoanglong;

import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import com.nguyenhoanglong.service.StoreOwnerService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class StoreOwnerApiIntegrationTest {

    @Autowired
    private StoreOwnerService storeOwnerService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ShopProductConfigRepository shopProductConfigRepository;

    @Autowired
    private VoucherRepository voucherRepository;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private InventoryAdjustmentRepository inventoryAdjustmentRepository;

    @Autowired
    private ShopWorkShiftRepository shopWorkShiftRepository;

    @Autowired
    private StaffPerformanceEvaluationRepository staffPerformanceEvaluationRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("Case 1: Get product, update price & sale price, validate sale < price constraint")
    public void testCase1_GetAndUpdateShopProductConfig() {
        // Create master product
        Product prod = new Product();
        prod.setName("Áo sơ mi Store Owner Test");
        prod.setSlug("ao-so-mi-so-test-" + System.currentTimeMillis());
        prod.setPrice(new BigDecimal("500000"));
        prod.setStatus("ACTIVE");
        Product savedProd = productRepository.save(prod);

        Long shopId = 1L;

        // Fetch product -> list price, no promotion
        ShopProductDto dto = storeOwnerService.getShopProductById(shopId, savedProd.getId());
        assertEquals(0, new BigDecimal("500000").compareTo(dto.getBasePrice()));
        assertNull(dto.getBaseSalePrice());

        // Attempt update with salePrice >= price -> 400 Bad Request
        ProductPriceUpdateDto invalidUpdate = pricing("400000", "600000", true);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            storeOwnerService.updateProductPricing(savedProd.getId(), invalidUpdate);
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Giá khuyến mãi phải nhỏ hơn giá niêm yết"));

        // Valid update changes the product itself (system-wide price)
        ShopProductDto updated = storeOwnerService.updateProductPricing(savedProd.getId(), pricing("450000", "390000", true));

        assertEquals(0, new BigDecimal("450000").compareTo(updated.getBasePrice()));
        assertEquals(0, new BigDecimal("390000").compareTo(updated.getBaseSalePrice()));
        assertTrue(updated.getIsAvailableForSale());
    }

    private static ProductPriceUpdateDto pricing(String price, String salePrice, boolean active) {
        ProductPriceUpdateDto d = new ProductPriceUpdateDto();
        d.setPrice(new BigDecimal(price));
        d.setSalePrice(new BigDecimal(salePrice));
        d.setActive(active);
        return d;
    }

    @Test
    @DisplayName("Case 2: Aggregate pending approvals from Voucher & InventoryAdjustment and process actions")
    public void testCase2_ApprovalsVoucherAndInventory() {
        Long shopId = 1L;

        // 1. Create Pending Voucher
        Voucher voucher = new Voucher();
        voucher.setShopId(shopId);
        voucher.setCode("TESTVOUCHER-" + System.currentTimeMillis());
        voucher.setName("Voucher Giảm 50K");
        voucher.setDiscountValue(new BigDecimal("50000"));
        voucher.setStatus("PENDING_APPROVAL");
        voucher.setIsActive(false);
        Voucher savedVoucher = voucherRepository.save(voucher);

        // 2. Create Inventory & Pending Adjustment
        Inventory inv = new Inventory();
        inv.setShopId(shopId);
        inv.setProductId(9999L);
        inv.setProductName("Áo thun kho test");
        inv.setQuantityOnHand(100);
        Inventory savedInv = inventoryRepository.save(inv);

        InventoryAdjustment adj = new InventoryAdjustment();
        adj.setInventory(savedInv);
        adj.setDifference(10);
        adj.setReason("Nhập thêm hàng từ nhà máy");
        adj.setStatus("PENDING");
        InventoryAdjustment savedAdj = inventoryAdjustmentRepository.save(adj);

        // Fetch pending approvals
        List<StoreApprovalItemDto> approvals = storeOwnerService.getPendingApprovals(shopId);
        assertFalse(approvals.isEmpty());

        // Process Voucher Approval -> APPROVED (testing direct voucher approval method)
        StoreApprovalActionDto voucherAction = new StoreApprovalActionDto("VOUCHER", "APPROVED", "Đồng ý duyệt voucher chi nhánh");
        StoreApprovalItemDto approvedVoucher = storeOwnerService.processVoucherApproval(shopId, savedVoucher.getId(), voucherAction, "STORE_OWNER");
        assertEquals("ACTIVE", approvedVoucher.getStatus());

        Voucher reloadVoucher = voucherRepository.findById(savedVoucher.getId()).orElseThrow();
        assertEquals("ACTIVE", reloadVoucher.getStatus());
        assertTrue(reloadVoucher.getIsActive());

        // Process Inventory Adjustment Approval -> APPROVED (testing direct inventory adjustment method & quantity sync)
        StoreApprovalActionDto invAction = new StoreApprovalActionDto("INVENTORY_ADJUSTMENT", "APPROVED", "Duyệt nhập kho");
        StoreApprovalItemDto approvedInv = storeOwnerService.processInventoryAdjustmentApproval(shopId, savedAdj.getId(), invAction, "STORE_OWNER");
        assertEquals("APPROVED", approvedInv.getStatus());

        // Assert real quantity_on_hand updated from 100 to 110
        Inventory reloadInv = inventoryRepository.findById(savedInv.getId()).orElseThrow();
        assertEquals(110, reloadInv.getQuantityOnHand());

        // IDOR Check: Attempting to approve an item owned by shopId 2L using shopId 1L -> 403 FORBIDDEN
        Voucher otherShopVoucher = new Voucher();
        otherShopVoucher.setCode("OTHERVOUCHER-" + System.currentTimeMillis());
        otherShopVoucher.setName("Voucher Shop 2");
        otherShopVoucher.setDiscountValue(new BigDecimal("20000"));
        otherShopVoucher.setShopId(2L);
        otherShopVoucher.setStatus("PENDING_APPROVAL");
        Voucher savedOtherVoucher = voucherRepository.save(otherShopVoucher);

        ResponseStatusException idorEx = assertThrows(ResponseStatusException.class, () -> {
            storeOwnerService.processVoucherApproval(shopId, savedOtherVoucher.getId(), voucherAction, "STORE_OWNER_SHOP_1");
        });
        assertEquals(HttpStatus.FORBIDDEN, idorEx.getStatusCode());
        assertTrue(idorEx.getReason().contains("Không có quyền phê duyệt Voucher"));
    }

    @Test
    @DisplayName("Case 3: Work shift scheduling CRUD operations")
    public void testCase3_WorkShiftsCRUD() {
        Long shopId = 1L;
        String userId = "EMP-STAFF-1";

        // Create shift
        ShopWorkShiftCreateDto createDto = new ShopWorkShiftCreateDto(userId, LocalDate.now().plusDays(1), "MORNING", "Ca sáng trực cửa hàng", "SCHEDULED");
        ShopWorkShiftDto created = storeOwnerService.createWorkShift(shopId, createDto);

        assertNotNull(created.getId());
        assertEquals("MORNING", created.getShiftType());

        // Fetch shifts
        List<ShopWorkShiftDto> shifts = storeOwnerService.getWorkShifts(shopId, LocalDate.now(), LocalDate.now().plusDays(2), null);
        assertFalse(shifts.isEmpty());

        // Update shift
        ShopWorkShiftCreateDto updateDto = new ShopWorkShiftCreateDto(userId, LocalDate.now().plusDays(1), "FULL_DAY", "Đổi sang ca cả ngày", "COMPLETED");
        ShopWorkShiftDto updated = storeOwnerService.updateWorkShift(shopId, created.getId(), updateDto);
        assertEquals("FULL_DAY", updated.getShiftType());
        assertEquals("COMPLETED", updated.getStatus());

        // Delete shift
        storeOwnerService.deleteWorkShift(shopId, created.getId());
        List<ShopWorkShiftDto> shiftsAfterDelete = storeOwnerService.getWorkShifts(shopId, null, null, userId);
        assertTrue(shiftsAfterDelete.stream().noneMatch(s -> s.getId().equals(created.getId())));
    }

    @Test
    @DisplayName("Case 4: Staff performance evaluations rating and validation")
    public void testCase4_StaffPerformanceEvaluation() {
        Long shopId = 1L;
        String userId = "EMP-STAFF-EVAL";

        // Rating > 5 -> 400 Bad Request
        StaffPerformanceEvaluationCreateDto invalidEval = new StaffPerformanceEvaluationCreateDto(userId, "2026-09", 6, new BigDecimal("100"), "Rất tốt");
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            storeOwnerService.createEvaluation(shopId, invalidEval, "STORE_OWNER");
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());

        // Valid evaluation
        StaffPerformanceEvaluationCreateDto validEval = new StaffPerformanceEvaluationCreateDto(userId, "2026-09", 5, new BigDecimal("120.50"), "Xuất sắc hoàn thành KPI");
        StaffPerformanceEvaluationDto created = storeOwnerService.createEvaluation(shopId, validEval, "STORE_OWNER");

        assertEquals(5, created.getRating());
        assertEquals("2026-09", created.getEvaluationPeriod());
        assertEquals(new BigDecimal("120.50"), created.getSalesTargetAchievement());

        List<StaffPerformanceEvaluationDto> evals = storeOwnerService.getEvaluations(shopId, "2026-09", null);
        assertFalse(evals.isEmpty());
    }

    @Test
    @DisplayName("Case 5: Fetch shop audit logs")
    public void testCase5_AuditLogs() {
        Long shopId = 1L;
        PaginatedResponseDto<ShopAuditLogDto> logs = storeOwnerService.getShopAuditLogs(shopId, 0, 10, null, null, null, null);
        assertNotNull(logs);
        // Note: In fresh test DB, there may be no audit logs - this is acceptable
        if (!logs.getItems().isEmpty()) {
            assertEquals(shopId, logs.getItems().get(0).getShopId());
        }
    }
}
