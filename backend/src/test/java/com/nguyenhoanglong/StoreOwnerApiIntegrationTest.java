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

    @Autowired
    private ShopRepository shopRepository;

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
        // The service only schedules an existing staff member of the same shop ("EMP-STAFF-1" never existed)
        Shop shop = new Shop();
        shop.setName("Shop ca lam test " + System.currentTimeMillis());
        shop.setIsActive(true);
        Long shopId = shopRepository.save(shop).getId();
        String userId = userRepository.save(User.builder()
                .fullName("Nhân viên ca test").email("staff-shift-" + System.currentTimeMillis() + "@test.local")
                .passwordHash("x").role(Role.SALES_STAFF).shopId(shopId).status("ACTIVE").emailVerified(true)
                .build()).getId();

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

    @Autowired
    private com.nguyenhoanglong.service.MarketingService marketingService;

    @Autowired
    private SystemNotificationRepository notificationRepository;

    @Autowired
    private com.nguyenhoanglong.service.SalesNotificationService salesNotificationService;

    private User user(String prefix, Role role, Long shopId) {
        User u = new User();
        u.setEmail(prefix + "-" + System.nanoTime() + "@test.local");
        u.setFullName("Test " + role.name());
        u.setPasswordHash("hashed_pwd");
        u.setStatus("ACTIVE");
        u.setRole(role);
        u.setShopId(shopId);
        return userRepository.save(u);
    }

    private List<SystemNotification> bell(User u) {
        return notificationRepository.findTop20ByRecipientUserIdOrderByCreatedAtDesc(u.getId());
    }

    @Test
    @DisplayName("Case 6: Voucher request rings the owner; revision / approval ring the marketing staff who sent it")
    public void testCase6_ApprovalNotifications() {
        Long shopId = 9_100L + (System.nanoTime() % 1000);
        User owner = user("owner", Role.SHOP_OWNER, shopId);
        User marketer = user("mkt", Role.MARKETING_STAFF, shopId);

        Voucher v = new Voucher();
        v.setCode("NOTIF-" + System.nanoTime());
        v.setName("Voucher thông báo");
        v.setType("FIXED");
        v.setDiscountValue(new BigDecimal("30000"));
        Voucher created = marketingService.createVoucher(v, marketer.getEmail());
        assertEquals("PENDING_APPROVAL", created.getStatus());
        assertTrue(bell(owner).stream().anyMatch(n -> "APPROVAL_REQUEST".equals(n.getType())
                && n.getMessage().contains(created.getCode())));

        // Revision needs a note, then reaches the staff member who created the voucher.
        assertThrows(ResponseStatusException.class, () -> storeOwnerService.processVoucherApproval(shopId, created.getId(),
                new StoreApprovalActionDto("VOUCHER", "REVISION_REQUESTED", " "), owner.getEmail()));
        storeOwnerService.processVoucherApproval(shopId, created.getId(),
                new StoreApprovalActionDto("VOUCHER", "REVISION_REQUESTED", "Giảm giá quá cao"), owner.getEmail());
        assertEquals("REVISION_REQUESTED", voucherRepository.findById(created.getId()).orElseThrow().getStatus());
        assertTrue(bell(marketer).stream().anyMatch(n -> "APPROVAL_REVISION_REQUESTED".equals(n.getType())
                && n.getMessage().contains("Giảm giá quá cao")));

        // Editing it (the form always sends the entity's default ACTIVE status) resubmits it to the owner.
        Voucher edit = new Voucher();
        edit.setType("FIXED");
        edit.setDiscountValue(new BigDecimal("20000"));
        assertEquals("PENDING_APPROVAL", marketingService.updateVoucher(created.getId(), edit, marketer.getEmail()).getStatus());
        assertTrue(bell(owner).stream().anyMatch(n -> n.getTitle().contains("chờ duyệt lại")));

        storeOwnerService.processVoucherApproval(shopId, created.getId(),
                new StoreApprovalActionDto("VOUCHER", "APPROVED", null), owner.getEmail());
        assertTrue(bell(marketer).stream().anyMatch(n -> "APPROVAL_APPROVED".equals(n.getType())));
    }

    @Test
    @DisplayName("Case 8: Staff edit / delete of an approved voucher waits for the owner; the live voucher is untouched until then")
    public void testCase8_VoucherChangeRequests() {
        Long shopId = 9_300L + (System.nanoTime() % 1000);
        User owner = user("owner", Role.SHOP_OWNER, shopId);
        User marketer = user("mkt", Role.MARKETING_STAFF, shopId);

        Voucher v = new Voucher();
        v.setCode("LIVE-" + System.nanoTime());
        v.setName("Voucher đang chạy");
        v.setType("FIXED");
        v.setDiscountValue(new BigDecimal("10000"));
        Voucher created = marketingService.createVoucher(v, marketer.getEmail());
        storeOwnerService.processVoucherApproval(shopId, created.getId(),
                new StoreApprovalActionDto("VOUCHER", "APPROVED", null), owner.getEmail());

        // Edit: becomes a request, live voucher keeps its value.
        Voucher edit = new Voucher();
        edit.setType("FIXED");
        edit.setDiscountValue(new BigDecimal("90000"));
        var outcome = marketingService.editVoucher(created.getId(), edit, marketer.getEmail());
        assertTrue(outcome.awaitingApproval());
        Voucher live = voucherRepository.findById(created.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("10000").compareTo(live.getDiscountValue()));
        assertEquals("ACTIVE", live.getStatus());
        assertTrue(bell(owner).stream().anyMatch(n -> n.getMessage().contains("10000 → 90000")));

        // Only one pending change at a time; delete is blocked meanwhile.
        ResponseStatusException conflict = assertThrows(ResponseStatusException.class,
                () -> marketingService.removeVoucher(created.getId(), marketer.getEmail()));
        assertEquals(HttpStatus.CONFLICT, conflict.getStatusCode());

        StoreApprovalItemDto item = storeOwnerService.getPendingApprovals(shopId).stream()
                .filter(a -> "VOUCHER_UPDATE".equals(a.getType())).findFirst().orElseThrow();
        storeOwnerService.processApprovalAction(shopId, item.getApprovalId(),
                new StoreApprovalActionDto(null, "APPROVED", null), owner.getEmail());
        assertEquals(0, new BigDecimal("90000").compareTo(voucherRepository.findById(created.getId()).orElseThrow().getDiscountValue()));
        assertTrue(bell(marketer).stream().anyMatch(n -> "APPROVAL_APPROVED".equals(n.getType())
                && n.getMessage().contains("Yêu cầu sửa")));

        // Cancelling via the status endpoint can't skip the delete approval.
        assertThrows(ResponseStatusException.class,
                () -> marketingService.updateVoucherStatus(created.getId(), "CANCELLED", marketer.getEmail()));

        // Delete: rejected keeps the voucher, approved removes it.
        assertTrue(marketingService.removeVoucher(created.getId(), marketer.getEmail()).awaitingApproval());
        String deleteId = storeOwnerService.getPendingApprovals(shopId).stream()
                .filter(a -> "VOUCHER_DELETE".equals(a.getType())).findFirst().orElseThrow().getApprovalId();
        storeOwnerService.processApprovalAction(shopId, deleteId,
                new StoreApprovalActionDto(null, "REJECTED", "Voucher vẫn đang hiệu quả"), owner.getEmail());
        assertTrue(voucherRepository.findById(created.getId()).isPresent());
        assertTrue(bell(marketer).stream().anyMatch(n -> "APPROVAL_REJECTED".equals(n.getType())
                && n.getMessage().contains("Voucher vẫn đang hiệu quả")));

        marketingService.removeVoucher(created.getId(), marketer.getEmail());
        String deleteAgain = storeOwnerService.getPendingApprovals(shopId).stream()
                .filter(a -> "VOUCHER_DELETE".equals(a.getType())).findFirst().orElseThrow().getApprovalId();
        storeOwnerService.processApprovalAction(shopId, deleteAgain,
                new StoreApprovalActionDto(null, "APPROVED", null), owner.getEmail());
        assertTrue(voucherRepository.findById(created.getId()).isEmpty());

        // Owners change their vouchers directly.
        Voucher own = new Voucher();
        own.setCode("OWN-" + System.nanoTime());
        own.setName("Voucher chủ shop");
        own.setType("FIXED");
        own.setDiscountValue(new BigDecimal("5000"));
        Voucher ownCreated = marketingService.createVoucher(own, owner.getEmail());
        assertFalse(marketingService.editVoucher(ownCreated.getId(), edit, owner.getEmail()).awaitingApproval());
    }

    @Test
    @DisplayName("Case 9: A rejected voucher's bell opens its edit form; saving the fix resubmits it to the owner")
    public void testCase9_RejectedVoucherResubmit() {
        Long shopId = 9_400L + (System.nanoTime() % 1000);
        User owner = user("owner", Role.SHOP_OWNER, shopId);
        User marketer = user("mkt", Role.MARKETING_STAFF, shopId);

        Voucher v = new Voucher();
        v.setCode("REJ-" + System.nanoTime());
        v.setName("Voucher bị từ chối");
        v.setType("FIXED");
        v.setDiscountValue(new BigDecimal("80000"));
        Voucher created = marketingService.createVoucher(v, marketer.getEmail());
        storeOwnerService.processVoucherApproval(shopId, created.getId(),
                new StoreApprovalActionDto("VOUCHER", "REJECTED", "Mức giảm quá cao"), owner.getEmail());

        SystemNotification rejected = bell(marketer).stream()
                .filter(n -> "APPROVAL_REJECTED".equals(n.getType())).findFirst().orElseThrow();
        assertEquals("/staff/dashboard/marketing/vouchers?edit=" + created.getId(), rejected.getTargetUrl());
        assertTrue(rejected.getMessage().contains("gửi lại"));

        int ownerBellBefore = bell(owner).size();
        Voucher fix = new Voucher();
        fix.setType("FIXED");
        fix.setDiscountValue(new BigDecimal("30000"));
        var outcome = marketingService.editVoucher(created.getId(), fix, marketer.getEmail());
        assertFalse(outcome.awaitingApproval()); // a draft, edited in place
        assertEquals("PENDING_APPROVAL", outcome.voucher().getStatus());
        assertEquals(ownerBellBefore + 1, bell(owner).size());
        assertTrue(storeOwnerService.getPendingApprovals(shopId).stream()
                .anyMatch(a -> ("VOUCHER-" + created.getId()).equals(a.getApprovalId())));
    }

    @Test
    @DisplayName("Case 7: New orders ring sales staff, not the store owner")
    public void testCase7_NewOrderBellSkipsOwner() {
        Long shopId = 9_200L + (System.nanoTime() % 1000);
        User owner = user("owner", Role.SHOP_OWNER, shopId);
        User sales = user("sales", Role.SALES_STAFF, shopId);

        Order order = new Order();
        order.setShopId(shopId);
        order.setOrderCode("ORD-NOTIF-" + System.nanoTime());
        order.setCustomerName("Khách test");
        order.setTotalAmount(100000.0);
        salesNotificationService.notifyNewOrderAwaitingConfirmation(order);

        assertEquals(1, bell(sales).size());
        assertTrue(bell(owner).isEmpty());
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
