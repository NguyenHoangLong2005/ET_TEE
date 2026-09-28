package com.nguyenhoanglong.service.impl;

import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import com.nguyenhoanglong.service.StoreOwnerService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StoreOwnerServiceImpl implements StoreOwnerService {

    private final ShopProductConfigRepository shopProductConfigRepository;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final VoucherRepository voucherRepository;
    private final InventoryAdjustmentRepository inventoryAdjustmentRepository;
    private final InventoryRepository inventoryRepository;
    private final ShopWorkShiftRepository shopWorkShiftRepository;
    private final StaffPerformanceEvaluationRepository staffPerformanceEvaluationRepository;
    private final UserRepository userRepository;
    private final StaffAuditLogRepository staffAuditLogRepository;
    private final OrderRepository orderRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public StoreOwnerServiceImpl(ShopProductConfigRepository shopProductConfigRepository,
                                 ProductRepository productRepository,
                                 CategoryRepository categoryRepository,
                                 VoucherRepository voucherRepository,
                                 InventoryAdjustmentRepository inventoryAdjustmentRepository,
                                 InventoryRepository inventoryRepository,
                                 ShopWorkShiftRepository shopWorkShiftRepository,
                                 StaffPerformanceEvaluationRepository staffPerformanceEvaluationRepository,
                                 UserRepository userRepository,
                                 StaffAuditLogRepository staffAuditLogRepository,
                                 OrderRepository orderRepository,
                                 org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.shopProductConfigRepository = shopProductConfigRepository;
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.voucherRepository = voucherRepository;
        this.inventoryAdjustmentRepository = inventoryAdjustmentRepository;
        this.inventoryRepository = inventoryRepository;
        this.shopWorkShiftRepository = shopWorkShiftRepository;
        this.staffPerformanceEvaluationRepository = staffPerformanceEvaluationRepository;
        this.userRepository = userRepository;
        this.staffAuditLogRepository = staffAuditLogRepository;
        this.orderRepository = orderRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional(readOnly = true)
    public PaginatedResponseDto<ShopProductDto> getShopProducts(Long shopId, int page, int size, String keyword, Long categoryId, String status) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        Page<Product> productsPage;
        if (keyword != null && !keyword.trim().isEmpty()) {
            productsPage = productRepository.findByNameContainingIgnoreCase(keyword.trim(), pageable);
        } else if (categoryId != null) {
            productsPage = productRepository.findByCategoryId(categoryId, pageable);
        } else {
            productsPage = productRepository.findAll(pageable);
        }

        List<Long> productIds = productsPage.getContent().stream().map(Product::getId).collect(Collectors.toList());
        Map<Long, ShopProductConfig> configMap = shopProductConfigRepository.findByShopIdAndProductIdIn(shopId, productIds)
                .stream()
                .collect(Collectors.toMap(ShopProductConfig::getProductId, c -> c));

        List<ShopProductDto> dtos = productsPage.getContent().stream().map(product -> {
            ShopProductConfig config = configMap.get(product.getId());
            String imageUrl = (!product.getImages().isEmpty()) ? product.getImages().get(0).getImageUrl() : "";
            String categoryName = (product.getCategory() != null) ? product.getCategory().getName() : "Khác";

            BigDecimal localPrice = (config != null) ? config.getLocalPrice() : null;
            BigDecimal localPromoPrice = (config != null) ? config.getLocalPromoPrice() : null;
            Boolean isAvailableForSale = (config != null) ? config.getIsAvailableForSale() : true;

            return ShopProductDto.builder()
                    .id(product.getId())
                    .name(product.getName())
                    .slug(product.getSlug())
                    .categoryName(categoryName)
                    .brand(product.getBrand())
                    .basePrice(product.getPrice())
                    .baseSalePrice(product.getSalePrice())
                    .localPrice(localPrice)
                    .localPromoPrice(localPromoPrice)
                    .isAvailableForSale(isAvailableForSale)
                    .status(product.getStatus())
                    .imageUrl(imageUrl)
                    .build();
        }).collect(Collectors.toList());

        return new PaginatedResponseDto<>(
                dtos,
                productsPage.getTotalElements(),
                page,
                size,
                productsPage.getTotalPages(),
                Map.of("shopId", shopId)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ShopProductDto getShopProductById(Long shopId, Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay san pham voi ID: " + productId));

        Optional<ShopProductConfig> configOpt = shopProductConfigRepository.findByShopIdAndProductId(shopId, productId);
        ShopProductConfig config = configOpt.orElse(null);

        String imageUrl = (!product.getImages().isEmpty()) ? product.getImages().get(0).getImageUrl() : "";
        String categoryName = (product.getCategory() != null) ? product.getCategory().getName() : "Khac";

        return ShopProductDto.builder()
                .id(product.getId())
                .name(product.getName())
                .slug(product.getSlug())
                .categoryName(categoryName)
                .brand(product.getBrand())
                .basePrice(product.getPrice())
                .baseSalePrice(product.getSalePrice())
                .localPrice(config != null ? config.getLocalPrice() : null)
                .localPromoPrice(config != null ? config.getLocalPromoPrice() : null)
                .isAvailableForSale(config != null ? config.getIsAvailableForSale() : true)
                .status(product.getStatus())
                .imageUrl(imageUrl)
                .build();
    }

    @Override
    @Transactional
    public ShopProductDto updateShopProductConfig(Long shopId, Long productId, ShopProductConfigUpdateDto updateDto) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay san pham voi ID: " + productId));

        BigDecimal effectivePrice = updateDto.getLocalPrice() != null ? updateDto.getLocalPrice() : product.getPrice();
        if (updateDto.getLocalPromoPrice() != null && effectivePrice != null) {
            if (updateDto.getLocalPromoPrice().compareTo(effectivePrice) > 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giá khuyến mãi local không thể lớn hơn giá niêm yết (" + effectivePrice + ")");
            }
        }

        ShopProductConfig config = shopProductConfigRepository.findByShopIdAndProductId(shopId, productId)
                .orElseGet(() -> new ShopProductConfig(shopId, productId, null, null, true));

        if (updateDto.getLocalPrice() != null) config.setLocalPrice(updateDto.getLocalPrice());
        if (updateDto.getLocalPromoPrice() != null) config.setLocalPromoPrice(updateDto.getLocalPromoPrice());
        if (updateDto.getIsAvailableForSale() != null) config.setIsAvailableForSale(updateDto.getIsAvailableForSale());

        shopProductConfigRepository.save(config);

        return getShopProductById(shopId, productId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoreApprovalItemDto> getPendingApprovals(Long shopId) {
        List<StoreApprovalItemDto> items = new ArrayList<>();

        // Da loc theo shopId + status o tang DB, khong con findAll() + filter trong JVM.
        List<Voucher> vouchers = voucherRepository.findPendingApprovalByShopId(shopId);
        for (Voucher v : vouchers) {
            items.add(StoreApprovalItemDto.builder()
                    .approvalId("VOUCHER-" + v.getId())
                    .type("VOUCHER")
                    .title("Duyet Ma giam gia / Voucher: " + v.getCode())
                    .description(v.getName() + " (Giam: " + v.getDiscountValue() + ")")
                    .requestedBy(v.getCreatedBy() != null ? v.getCreatedBy() : "Marketing Team")
                    .status(v.getStatus())
                    .createdAt(v.getCreatedAt())
                    .build());
        }

        // JOIN FETCH inventory, loc san theo shopId + status.
        List<InventoryAdjustment> adjustments = inventoryAdjustmentRepository.findPendingApprovalByShopId(shopId);
        for (InventoryAdjustment adj : adjustments) {
            Inventory inv = adj.getInventory();
            items.add(StoreApprovalItemDto.builder()
                    .approvalId("INV_ADJ-" + adj.getId())
                    .type("INVENTORY_ADJUSTMENT")
                    .title("Duyet dieu chinh ton kho: " + inv.getProductName())
                    .description("Ly do: " + adj.getReason() + " | Thay doi: " + (adj.getDifference() > 0 ? "+" : "") + adj.getDifference())
                    .requestedBy(adj.getRequestedBy() != null ? "NV Kho #" + adj.getRequestedBy() : "Nhan vien kho")
                    .status(adj.getStatus())
                    .createdAt(adj.getCreatedAt())
                    .build());
        }

        items.sort(Comparator.comparing(StoreApprovalItemDto::getCreatedAt).reversed());
        return items;
    }

    @Override
    @Transactional
    public StoreApprovalItemDto processVoucherApproval(Long shopId, Long voucherId, StoreApprovalActionDto actionDto, String actorIdOrEmail) {
        String actionStr = (actionDto.getAction() != null) ? actionDto.getAction().trim().toUpperCase() : "";
        if (!"APPROVED".equals(actionStr) && !"REJECTED".equals(actionStr)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hanh dong phe duyet khong hop le");
        }

        Voucher voucher = voucherRepository.findById(voucherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay Voucher voi ID: " + voucherId));

        if (voucher.getShopId() == null || !voucher.getShopId().equals(shopId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền phê duyệt Voucher không thuộc chi nhánh của bạn (Mã shop yêu cầu: " + shopId + ")");
        }

        if ("APPROVED".equals(actionStr)) {
            voucher.setStatus("ACTIVE");
            voucher.setIsActive(true);
        } else {
            voucher.setStatus("REJECTED");
            voucher.setIsActive(false);
        }
        voucher.setUpdatedBy(actorIdOrEmail);
        voucher.setUpdatedAt(LocalDateTime.now());
        voucherRepository.save(voucher);

        return StoreApprovalItemDto.builder()
                .approvalId("VOUCHER-" + voucher.getId())
                .type("VOUCHER")
                .title("Ma giam gia: " + voucher.getCode())
                .description(voucher.getName())
                .requestedBy(voucher.getCreatedBy())
                .status(voucher.getStatus())
                .createdAt(voucher.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public StoreApprovalItemDto processInventoryAdjustmentApproval(Long shopId, Long adjustmentId, StoreApprovalActionDto actionDto, String actorIdOrEmail) {
        String actionStr = (actionDto.getAction() != null) ? actionDto.getAction().trim().toUpperCase() : "";
        if (!"APPROVED".equals(actionStr) && !"REJECTED".equals(actionStr)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hanh dong phe duyet khong hop le");
        }

        InventoryAdjustment adj = inventoryAdjustmentRepository.findById(adjustmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay phieu dieu chinh kho ID: " + adjustmentId));

        if (adj.getInventory() == null || adj.getInventory().getShopId() == null || !adj.getInventory().getShopId().equals(shopId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Khong co quyen phe duyet phieu dieu chinh ton kho khong thuoc chi nhanh cua ban");
        }

        if ("APPROVED".equals(actionStr)) {
            adj.setStatus("APPROVED");
            if (adj.getInventory() != null) {
                Inventory inv = adj.getInventory();
                int newQty = Math.max(0, inv.getQuantityOnHand() + adj.getDifference());
                inv.setQuantityOnHand(newQty);
                inventoryRepository.save(inv);
            }
        } else {
            adj.setStatus("REJECTED");
        }
        inventoryAdjustmentRepository.save(adj);

        String prodName = (adj.getInventory() != null) ? adj.getInventory().getProductName() : "San pham";
        return StoreApprovalItemDto.builder()
                .approvalId("INV_ADJ-" + adj.getId())
                .type("INVENTORY_ADJUSTMENT")
                .title("Dieu chinh ton kho: " + prodName)
                .description("Ly do: " + adj.getReason())
                .requestedBy(adj.getRequestedBy() != null ? adj.getRequestedBy().toString() : "Kho")
                .status(adj.getStatus())
                .createdAt(adj.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public StoreApprovalItemDto processApprovalAction(Long shopId, String approvalId, StoreApprovalActionDto actionDto, String actorIdOrEmail) {
        if (approvalId.startsWith("VOUCHER-") || "VOUCHER".equalsIgnoreCase(actionDto.getType())) {
            Long voucherId = parseIdFromApprovalId(approvalId, "VOUCHER-");
            return processVoucherApproval(shopId, voucherId, actionDto, actorIdOrEmail);
        } else if (approvalId.startsWith("INV_ADJ-") || "INVENTORY_ADJUSTMENT".equalsIgnoreCase(actionDto.getType())) {
            Long adjId = parseIdFromApprovalId(approvalId, "INV_ADJ-");
            return processInventoryAdjustmentApproval(shopId, adjId, actionDto, actorIdOrEmail);
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Loai phe duyet khong hop le: " + approvalId);
        }
    }

    @Override
    public List<ShopWorkShiftDto> getWorkShifts(Long shopId, LocalDate startDate, LocalDate endDate, String userId) {
        List<ShopWorkShift> shifts;
        if (startDate != null && endDate != null) {
            shifts = shopWorkShiftRepository.findByShopIdAndShiftDateBetween(shopId, startDate, endDate);
        } else if (userId != null && !userId.trim().isEmpty()) {
            shifts = shopWorkShiftRepository.findByShopIdAndUserId(shopId, userId.trim());
        } else {
            shifts = shopWorkShiftRepository.findByShopId(shopId);
        }

        return shifts.stream().map(this::mapToWorkShiftDto).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ShopWorkShiftDto createWorkShift(Long shopId, ShopWorkShiftCreateDto createDto) {
        if (createDto.getUserId() == null || createDto.getUserId().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ma/ID nhan vien (userId) la bat buoc khi phan ca");
        }
        if (createDto.getShiftDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngay phan ca (shiftDate) la bat buoc");
        }
        if (createDto.getShiftType() == null || createDto.getShiftType().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Loai ca lam viec (shiftType) la bat buoc");
        }

        String fullName = resolveUserFullName(createDto.getUserId().trim());

        ShopWorkShift shift = new ShopWorkShift();
        shift.setShopId(shopId);
        shift.setUserId(createDto.getUserId().trim());
        shift.setUserFullName(fullName);
        shift.setShiftDate(createDto.getShiftDate());
        shift.setShiftType(createDto.getShiftType().trim().toUpperCase());
        shift.setNote(createDto.getNote() != null ? createDto.getNote().trim() : null);
        shift.setStatus(createDto.getStatus() != null ? createDto.getStatus().trim().toUpperCase() : "SCHEDULED");

        ShopWorkShift saved = shopWorkShiftRepository.save(shift);
        return mapToWorkShiftDto(saved);
    }

    @Override
    @Transactional
    public ShopWorkShiftDto updateWorkShift(Long shopId, Long shiftId, ShopWorkShiftCreateDto updateDto) {
        ShopWorkShift shift = shopWorkShiftRepository.findById(shiftId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay ca lam viec ID: " + shiftId));

        if (!shift.getShopId().equals(shopId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Khong co quyen sua ca lam viec cua shop khac");
        }

        if (updateDto.getShiftDate() != null) shift.setShiftDate(updateDto.getShiftDate());
        if (updateDto.getShiftType() != null && !updateDto.getShiftType().trim().isEmpty()) {
            shift.setShiftType(updateDto.getShiftType().trim().toUpperCase());
        }
        if (updateDto.getNote() != null) shift.setNote(updateDto.getNote().trim());
        if (updateDto.getStatus() != null && !updateDto.getStatus().trim().isEmpty()) {
            shift.setStatus(updateDto.getStatus().trim().toUpperCase());
        }

        ShopWorkShift saved = shopWorkShiftRepository.save(shift);
        return mapToWorkShiftDto(saved);
    }

    @Override
    @Transactional
    public void deleteWorkShift(Long shopId, Long shiftId) {
        ShopWorkShift shift = shopWorkShiftRepository.findById(shiftId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay ca lam viec ID: " + shiftId));

        if (!shift.getShopId().equals(shopId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Khong co quyen xoa ca lam viec cua shop khac");
        }

        shopWorkShiftRepository.delete(shift);
    }

    @Override
    public List<StaffPerformanceEvaluationDto> getEvaluations(Long shopId, String period, String userId) {
        List<StaffPerformanceEvaluation> list;
        if (period != null && !period.trim().isEmpty()) {
            list = staffPerformanceEvaluationRepository.findByShopIdAndEvaluationPeriod(shopId, period.trim());
        } else if (userId != null && !userId.trim().isEmpty()) {
            list = staffPerformanceEvaluationRepository.findByShopIdAndUserId(shopId, userId.trim());
        } else {
            list = staffPerformanceEvaluationRepository.findByShopId(shopId);
        }

        return list.stream().map(this::mapToEvaluationDto).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public StaffPerformanceEvaluationDto createEvaluation(Long shopId, StaffPerformanceEvaluationCreateDto createDto, String evaluatedBy) {
        if (createDto.getUserId() == null || createDto.getUserId().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ID nhan vien (userId) la bat buoc");
        }
        if (createDto.getEvaluationPeriod() == null || createDto.getEvaluationPeriod().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ky danh gia (evaluationPeriod YYYY-MM) la bat buoc");
        }
        if (createDto.getRating() == null || createDto.getRating() < 1 || createDto.getRating() > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Diem danh gia rating phai thuoc tu 1 den 5 sao");
        }

        String fullName = resolveUserFullName(createDto.getUserId().trim());
        String period = createDto.getEvaluationPeriod().trim();

        StaffPerformanceEvaluation eval = staffPerformanceEvaluationRepository
                .findByShopIdAndUserIdAndEvaluationPeriod(shopId, createDto.getUserId().trim(), period)
                .orElseGet(StaffPerformanceEvaluation::new);

        eval.setShopId(shopId);
        eval.setUserId(createDto.getUserId().trim());
        eval.setUserFullName(fullName);
        eval.setEvaluationPeriod(period);
        eval.setRating(createDto.getRating());
        eval.setSalesTargetAchievement(createDto.getSalesTargetAchievement());
        eval.setFeedbackNotes(createDto.getFeedbackNotes() != null ? createDto.getFeedbackNotes().trim() : null);
        eval.setEvaluatedBy(evaluatedBy != null ? evaluatedBy : "Store Owner");

        StaffPerformanceEvaluation saved = staffPerformanceEvaluationRepository.save(eval);
        return mapToEvaluationDto(saved);
    }

    @Override
    public PaginatedResponseDto<ShopAuditLogDto> getShopAuditLogs(Long shopId, int page, int size, String action, String startDate, String endDate, String userId) {
        List<ShopAuditLogDto> logs = new ArrayList<>();
        
        List<StaffAuditLog> staffLogs = staffAuditLogRepository.findByShopIdOrderByCreatedAtDesc(shopId);
        
        for (StaffAuditLog log : staffLogs) {
            logs.add(ShopAuditLogDto.builder()
                    .id("SAL-" + log.getId())
                    .shopId(shopId)
                    .action(log.getAction())
                    .actorName(log.getActor() != null ? log.getActor().getFullName() : "System")
                    .actorRole(log.getActor() != null && log.getActor().getRole() != null ? log.getActor().getRole().name() : null)
                    .staffName(log.getStaff() != null ? log.getStaff().getFullName() : null)
                    .staffId(log.getStaff() != null ? log.getStaff().getId() : null)
                    .description(formatAuditDescription(log.getAction(), log.getOldValue(), log.getNewValue()))
                    .oldValue(log.getOldValue())
                    .newValue(log.getNewValue())
                    .timestamp(log.getCreatedAt())
                    .build());
        }
        
        if (action != null && !action.trim().isEmpty()) {
            logs = logs.stream()
                    .filter(l -> action.equalsIgnoreCase(l.getAction()))
                    .collect(Collectors.toList());
        }
        if (userId != null && !userId.trim().isEmpty()) {
            logs = logs.stream()
                    .filter(l -> userId.equals(l.getStaffId()))
                    .collect(Collectors.toList());
        }
        
        int total = logs.size();
        int start = Math.min(page * size, total);
        int end = Math.min(start + size, total);
        List<ShopAuditLogDto> pageContent = start < total ? logs.subList(start, end) : Collections.emptyList();

        return new PaginatedResponseDto<>(
                pageContent,
                total,
                page,
                size,
                (int) Math.ceil((double) total / size),
                Map.of("shopId", shopId)
        );
    }
    
    private String formatAuditDescription(String action, String oldValue, String newValue) {
        if (oldValue == null && newValue == null) {
            return "Thao tac: " + action;
        }
        if (oldValue != null && newValue != null) {
            return String.format("Thay doi tu '%s' thanh '%s'", oldValue, newValue);
        }
        if (newValue != null) {
            return "Gia tri moi: " + newValue;
        }
        return "Gia tri cu: " + oldValue;
    }

    @Override
    public Map<String, Object> getShopDashboardMetrics(Long shopId) {
        // Tat ca chi so duoc tong hop bang SQL. Phien ban truoc load toan bo don hang cua shop
        // (va ca inventoryRepository.findAll()) roi dem bang stream, nen endpoint mat ~9s.
        Map<String, Object> metrics = new LinkedHashMap<>();

        Map<String, Long> countByStatus = new HashMap<>();
        Map<String, Double> amountByStatus = new HashMap<>();
        long totalOrders = 0;
        for (Object[] row : orderRepository.aggregateByStatusForShop(shopId)) {
            String statusName = row[0] != null ? ((OrderStatus) row[0]).name() : "PENDING_CONFIRMATION";
            long cnt = ((Number) row[1]).longValue();
            double amount = row[2] != null ? ((Number) row[2]).doubleValue() : 0.0;
            countByStatus.merge(statusName, cnt, Long::sum);
            amountByStatus.merge(statusName, amount, Double::sum);
            totalOrders += cnt;
        }

        long pendingOrders = countByStatus.getOrDefault("PENDING_CONFIRMATION", 0L)
                + countByStatus.getOrDefault("PENDING_PAYMENT", 0L);
        long confirmedOrders = countByStatus.getOrDefault("CONFIRMED", 0L);
        long shippedOrders = countByStatus.getOrDefault("PACKED", 0L)
                + countByStatus.getOrDefault("HANDED_TO_CARRIER", 0L)
                + countByStatus.getOrDefault("SHIPPING", 0L);
        long deliveredOrders = countByStatus.getOrDefault("DELIVERED", 0L);
        long cancelledOrders = countByStatus.getOrDefault("CANCELLED", 0L);

        BigDecimal totalRevenue = BigDecimal.valueOf(amountByStatus.getOrDefault("DELIVERED", 0.0));

        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);
        Double monthSum = orderRepository.sumAmountForShopByStatusBetween(
                shopId, OrderStatus.DELIVERED,
                monthStart.atStartOfDay(), monthStart.plusMonths(1).atStartOfDay());
        BigDecimal monthRevenue = BigDecimal.valueOf(monthSum != null ? monthSum : 0.0);

        long totalStaff = userRepository.countByShopId(shopId);
        long activeStaff = userRepository.countByShopIdAndStatus(shopId, "ACTIVE");

        long totalProducts = inventoryRepository.countByShopId(shopId);
        long lowStockProducts = inventoryRepository.countLowStockByShopId(shopId);

        List<StoreApprovalItemDto> pendingApprovals = getPendingApprovals(shopId);

        metrics.put("orders", Map.of(
            "total", totalOrders,
            "pending", pendingOrders,
            "confirmed", confirmedOrders,
            "shipped", shippedOrders,
            "delivered", deliveredOrders,
            "cancelled", cancelledOrders
        ));

        metrics.put("revenue", Map.of(
            "total", totalRevenue,
            "thisMonth", monthRevenue,
            "currency", "VND"
        ));

        metrics.put("staff", Map.of(
            "total", totalStaff,
            "active", activeStaff
        ));

        metrics.put("inventory", Map.of(
            "totalProducts", totalProducts,
            "lowStockAlerts", lowStockProducts
        ));

        metrics.put("approvals", Map.of(
            "pendingCount", pendingApprovals.size(),
            "items", pendingApprovals.stream().limit(5).toList()
        ));

        // Recent orders (last 5) - chi lay 5 dong tu DB
        List<Map<String, Object>> recentOrders = orderRepository
            .findByShopId(shopId, PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt")))
            .getContent().stream()
            .map(o -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", o.getId());
                row.put("orderCode", o.getOrderCode() != null ? o.getOrderCode() : "#" + o.getId());
                row.put("customerName", o.getCustomerName() != null ? o.getCustomerName() : "Khách hàng");
                row.put("totalAmount", o.getTotalAmount() != null ? o.getTotalAmount() : 0.0);
                String status = o.getStatus() != null ? o.getStatus().name() : (o.getOrderStatus() != null ? o.getOrderStatus() : "PENDING");
                row.put("status", status);
                row.put("createdAt", o.getCreatedAt() != null ? o.getCreatedAt().toString() : null);
                return row;
            })
            .toList();
        metrics.put("recentOrders", recentOrders);

        // Daily revenue for last 7 days - GROUP BY ngay o tang DB
        Map<LocalDate, long[]> dailyOrderCount = new HashMap<>();
        Map<LocalDate, Double> dailyRevenueSum = new HashMap<>();
        for (Object[] row : orderRepository.aggregateDailyForShop(
                shopId, today.minusDays(6).atStartOfDay(), OrderStatus.DELIVERED)) {
            LocalDate day = toLocalDate(row[0]);
            if (day == null) continue;
            dailyOrderCount.put(day, new long[]{ ((Number) row[1]).longValue() });
            dailyRevenueSum.put(day, row[2] != null ? ((Number) row[2]).doubleValue() : 0.0);
        }

        List<Map<String, Object>> dailyRevenue = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            Map<String, Object> dayData = new LinkedHashMap<>();
            dayData.put("date", day.toString());
            dayData.put("revenue", dailyRevenueSum.getOrDefault(day, 0.0));
            long[] cnt = dailyOrderCount.get(day);
            dayData.put("orders", cnt != null ? cnt[0] : 0L);
            dailyRevenue.add(dayData);
        }
        metrics.put("dailyRevenue", dailyRevenue);

        return metrics;
    }

    /** Ket qua CAST(... AS date) co the la java.sql.Date hoac LocalDate tuy driver. */
    private static LocalDate toLocalDate(Object value) {
        if (value == null) return null;
        if (value instanceof LocalDate d) return d;
        if (value instanceof java.sql.Date d) return d.toLocalDate();
        if (value instanceof java.time.LocalDateTime dt) return dt.toLocalDate();
        return null;
    }

    @Override
    public PaginatedResponseDto<Map<String, Object>> getShopOrders(Long shopId, int page, int size, String status) {
        // Phan trang tai DB. Truoc day ham nay load toan bo don hang cua shop roi subList,
        // khien /store-owner/orders?size=5 mat hang chuc giay khi bang orders lon.
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        OrderStatus statusFilter = null;
        if (status != null && !status.isBlank()) {
            try {
                statusFilter = OrderStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                // Bo qua filter khong hop le, tra ve toan bo thay vi loi 500.
            }
        }

        Page<Order> ordersPage = statusFilter != null
                ? orderRepository.findByShopIdAndStatus(shopId, statusFilter, pageable)
                : orderRepository.findByShopId(shopId, pageable);

        List<Map<String, Object>> content = ordersPage.getContent().stream()
            .map(o -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", o.getId());
                row.put("orderCode", o.getOrderCode() != null ? o.getOrderCode() : "#" + o.getId());
                row.put("customerName", o.getCustomerName() != null ? o.getCustomerName() : "Khách hàng");
                row.put("totalAmount", o.getTotalAmount() != null ? o.getTotalAmount() : 0.0);
                String s = o.getStatus() != null ? o.getStatus().name() : (o.getOrderStatus() != null ? o.getOrderStatus() : "PENDING");
                row.put("status", s);
                row.put("createdAt", o.getCreatedAt() != null ? o.getCreatedAt().toString() : null);
                return row;
            })
            .toList();

        PaginatedResponseDto<Map<String, Object>> result = new PaginatedResponseDto<>();
        result.setItems(content);
        result.setTotalItems((int) ordersPage.getTotalElements());
        result.setCurrentPage(page);
        result.setPageSize(size);
        result.setTotalPages(ordersPage.getTotalPages());
        return result;
    }

    private Long parseIdFromApprovalId(String approvalId, String prefix) {
        try {
            String idStr = approvalId.replace(prefix, "");
            return Long.parseLong(idStr);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dinh dang approvalId khong hop le: " + approvalId);
        }
    }

    private String resolveUserFullName(String userId) {
        return userRepository.findById(userId)
                .map(User::getFullName)
                .orElse("Nhan vien " + userId);
    }

    private ShopWorkShiftDto mapToWorkShiftDto(ShopWorkShift shift) {
        return ShopWorkShiftDto.builder()
                .id(shift.getId())
                .shopId(shift.getShopId())
                .userId(shift.getUserId())
                .userFullName(shift.getUserFullName())
                .shiftDate(shift.getShiftDate())
                .shiftType(shift.getShiftType())
                .note(shift.getNote())
                .status(shift.getStatus())
                .createdAt(shift.getCreatedAt())
                .build();
    }

    private StaffPerformanceEvaluationDto mapToEvaluationDto(StaffPerformanceEvaluation eval) {
        return StaffPerformanceEvaluationDto.builder()
                .id(eval.getId())
                .shopId(eval.getShopId())
                .userId(eval.getUserId())
                .userFullName(eval.getUserFullName())
                .evaluationPeriod(eval.getEvaluationPeriod())
                .rating(eval.getRating())
                .salesTargetAchievement(eval.getSalesTargetAchievement())
                .feedbackNotes(eval.getFeedbackNotes())
                .evaluatedBy(eval.getEvaluatedBy())
                .createdAt(eval.getCreatedAt())
                .build();
    }

    // ==========================================
    // 7. STAFF MANAGEMENT FOR SHOP
    // ==========================================

    @Override
    @Transactional(readOnly = true)
    public List<UserAdminDto> getShopStaff(Long shopId) {
        List<User> users = userRepository.findByShopId(shopId).stream()
                .filter(u -> u.getRole() != Role.USER && u.getRole() != Role.ADMIN)
                .collect(Collectors.toList());

        return users.stream().map(this::mapToUserAdminDto).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public UserAdminDto createShopStaff(Long shopId, UserCreateDto createDto, String actor) {
        String email = createDto.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email đã tồn tại trong hệ thống");
        }

        String employeeCode = (createDto.getEmployeeCode() != null && !createDto.getEmployeeCode().trim().isEmpty())
                ? createDto.getEmployeeCode().trim()
                : "NV-" + (System.currentTimeMillis() % 10000);

        if (userRepository.existsByEmployeeCode(employeeCode)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã nhân viên đã tồn tại");
        }

        Role role;
        try {
            role = Role.valueOf(createDto.getRoleCode());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Mã vai trò không hợp lệ: " + createDto.getRoleCode() + ". Vui lòng sử dụng mã vai trò đã được định nghĩa trong hệ thống.");
        }

        boolean shopLevelRole = role == Role.SALES_STAFF || role == Role.CSKH_STAFF
                || role == Role.WAREHOUSE_STAFF || role == Role.SHIPPING_STAFF;
        if (!shopLevelRole) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Chủ shop chỉ có thể tạo tài khoản nhân viên cấp chi nhánh (Bán hàng, CSKH, Kho, Vận chuyển)");
        }

        String rawPassword = (createDto.getInitialPassword() != null && !createDto.getInitialPassword().trim().isEmpty())
                ? createDto.getInitialPassword().trim()
                : generateRandomPassword();

        User newUser = User.builder()
                .fullName(createDto.getFullName().trim())
                .email(email)
                .phone(createDto.getPhone() != null ? createDto.getPhone().trim() : null)
                .employeeCode(employeeCode)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .emailVerified(true)
                .status("ACTIVE")
                .role(role)
                .shopId(shopId)
                .mustChangePassword(true)
                .build();

        User saved = userRepository.save(newUser);

        User actorUser = userRepository.findByEmail(actor)
                .orElseGet(() -> userRepository.findById(actor).orElse(null));

        staffAuditLogRepository.save(new StaffAuditLog(
                saved,
                actorUser != null ? actorUser : saved,
                "CREATE_STAFF",
                null,
                "Tạo nhân viên " + saved.getFullName() + " (" + role.name() + ")"
        ));

        return mapToUserAdminDto(saved);
    }

    @Override
    @Transactional
    public UserAdminDto updateShopStaffStatus(Long shopId, String staffId, UserStatusUpdateDto statusDto, String actor) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhân viên"));

        if (staff.getShopId() == null || !staff.getShopId().equals(shopId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nhân viên không thuộc chi nhánh quản lý của bạn");
        }

        if (staff.getRole() == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không thể khóa tài khoản Quản trị viên");
        }

        String oldStatus = staff.getStatus();
        String newStatus = statusDto.getStatus() != null ? statusDto.getStatus().toUpperCase() : "ACTIVE";

        if ("LOCKED".equals(newStatus)) {
            staff.setStatus("LOCKED");
            staff.setLockReason(statusDto.getLockReason() != null ? statusDto.getLockReason().trim() : "Khóa bởi chủ chi nhánh");
            staff.setLockedBy(actor);
            staff.setLockedAt(LocalDateTime.now());
        } else {
            staff.setStatus("ACTIVE");
            staff.setLockReason(null);
            staff.setLockedBy(null);
            staff.setLockedAt(null);
        }

        User saved = userRepository.save(staff);

        User actorUser = userRepository.findByEmail(actor)
                .orElseGet(() -> userRepository.findById(actor).orElse(null));

        staffAuditLogRepository.save(new StaffAuditLog(
                saved,
                actorUser != null ? actorUser : saved,
                "LOCKED".equals(newStatus) ? "LOCK_STAFF" : "UNLOCK_STAFF",
                oldStatus,
                newStatus + (statusDto.getLockReason() != null ? ": " + statusDto.getLockReason() : "")
        ));

        return mapToUserAdminDto(saved);
    }

    @Override
    @Transactional
    public ResetPasswordResponseDto resetShopStaffPassword(Long shopId, String staffId, String actor) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhân viên"));

        if (staff.getShopId() == null || !staff.getShopId().equals(shopId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nhân viên không thuộc chi nhánh quản lý của bạn");
        }

        if (staff.getRole() == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền khôi phục mật khẩu Admin");
        }

        String tempPassword = generateRandomPassword();
        staff.setPasswordHash(passwordEncoder.encode(tempPassword));
        staff.setMustChangePassword(true);
        userRepository.save(staff);

        User actorUser = userRepository.findByEmail(actor)
                .orElseGet(() -> userRepository.findById(actor).orElse(null));

        staffAuditLogRepository.save(new StaffAuditLog(
                staff,
                actorUser != null ? actorUser : staff,
                "RESET_PASSWORD",
                null,
                "Khôi phục mật khẩu tạm thời cho nhân viên"
        ));

        return ResetPasswordResponseDto.builder()
                .message("Khôi phục mật khẩu nhân viên thành công. Đã cấp mật khẩu tạm thời.")
                .mustChangePassword(true)
                .temporaryPassword(tempPassword)
                .build();
    }

    private UserAdminDto mapToUserAdminDto(User u) {
        return new UserAdminDto(
                u.getId(),
                u.getEmployeeCode(),
                u.getFullName(),
                u.getEmail(),
                u.getPhone(),
                u.getRole() != null ? u.getRole().name() : "STAFF",
                u.getShopId(),
                u.getStatus(),
                u.getLockReason(),
                u.getLockedBy(),
                u.getLockedAt(),
                u.isMustChangePassword(),
                u.getCreatedAt(),
                u.getUpdatedAt(),
                List.of()
        );
    }

    private String generateRandomPassword() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
        java.security.SecureRandom random = new java.security.SecureRandom();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 10; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
