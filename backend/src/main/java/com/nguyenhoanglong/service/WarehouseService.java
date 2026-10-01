package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.WarehouseOrderDto;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class WarehouseService {
    private static final Logger log = LoggerFactory.getLogger(WarehouseService.class);
    
    private final InventoryRepository inventories;
    private final StockReservationRepository reservations;
    private final OrderRepository orders;
    private final InventoryAdjustmentRepository adjustments;
    private final StocktakeRepository stocktakes;
    private final UserRepository userRepository;
    private final OrderStateMachine stateMachine;
    private final OrderStatusHistoryRepository historyRepository;
    private final GoodsReceiptRepository receipts;
    private final RestockRequestRepository restockRequests;
    private final ProductRepository products;
    private final SupplierRepository suppliers;
    private final ProductVariantRepository variants;

    public WarehouseService(
            InventoryRepository inventories, 
            StockReservationRepository reservations, 
            OrderRepository orders,
            InventoryAdjustmentRepository adjustments, 
            StocktakeRepository stocktakes, 
            UserRepository userRepository,
            OrderStateMachine stateMachine,
            OrderStatusHistoryRepository historyRepository,
            GoodsReceiptRepository receipts,
            RestockRequestRepository restockRequests,
            ProductRepository products,
            SupplierRepository suppliers,
            ProductVariantRepository variants) {
        this.inventories = inventories;
        this.reservations = reservations;
        this.orders = orders;
        this.adjustments = adjustments;
        this.stocktakes = stocktakes;
        this.userRepository = userRepository;
        this.stateMachine = stateMachine;
        this.historyRepository = historyRepository;
        this.receipts = receipts;
        this.restockRequests = restockRequests;
        this.products = products;
        this.suppliers = suppliers;
        this.variants = variants;
    }

    private Long resolveShopId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
        if (isAdmin) return null; // Admin has no restriction
        String name = auth.getName();
        User user = userRepository.findByEmail(name).orElseGet(() -> userRepository.findById(name).orElse(null));
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không xác định được người dùng hiện tại");
        }
        if (user.getShopId() == null) {
            // Non-admin staff with no shop assigned: every ownership check in
            // this class treats a null shopId as "no restriction", the same
            // sentinel used for ADMIN. Returning null here would let an
            // unassigned staff account see and operate on every shop's
            // inventory/orders. Fail closed instead.
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản chưa được gán vào chi nhánh nào. Vui lòng liên hệ quản trị viên.");
        }
        return user.getShopId();
    }

    private String resolveUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        String name = auth.getName();
        User user = userRepository.findByEmail(name).orElse(null);
        if (user == null) {
            user = userRepository.findById(name).orElse(null);
        }
        return user != null ? user.getId() : null;
    }

    private void checkInventoryOwnership(Inventory inventory) {
        Long shopId = resolveShopId();
        if (shopId != null && (inventory.getShopId() == null || !inventory.getShopId().equals(shopId))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền thao tác trên kho của cửa hàng khác");
        }
    }

    private void checkOrderOwnership(Order order) {
        Long shopId = resolveShopId();
        if (shopId != null && (order.getShopId() == null || !order.getShopId().equals(shopId))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền thao tác trên đơn hàng của cửa hàng khác");
        }
    }

    // ========== Inventory Operations ==========

    public List<Inventory> getInventory() {
        Long shopId = resolveShopId();
        return shopId == null ? inventories.findAll() : inventories.findByShopId(shopId);
    }

    public List<InventoryAdjustment> getAdjustments() {
        Long shopId = resolveShopId();
        return shopId == null ? adjustments.findAll() : adjustments.findByShopId(shopId);
    }

    @Transactional
    public Inventory inbound(Long productId, String productName, Integer quantity, String location) {
        return inbound(productId, productName, quantity, location, null, null, null);
    }

    /** Variants (colour / size) of a product, to pick which one a receipt restocks. */
    public record VariantOption(Long id, String sku, String color, String size, Integer availableQuantity) {}

    @Transactional(readOnly = true)
    public List<VariantOption> getProductVariants(Long productId) {
        return variants.findByProductId(productId).stream()
                .map(v -> new VariantOption(v.getId(), v.getSku(), v.getColor(), v.getSize(), v.getAvailableQuantity()))
                .toList();
    }

    /**
     * Records goods received. The storefront sells from product_variants, so the receipt must
     * name the variant it restocks: receipts used to raise only the per-product warehouse count,
     * and a sold-out size stayed sold out no matter how much was received.
     */
    @Transactional
    public Inventory inbound(Long productId, String productName, Integer quantity, String location,
                             Long supplierId, String note, Long variantId) {
        if (productId == null) throw new IllegalArgumentException("Vui lòng chọn sản phẩm cần nhập");
        if (quantity == null || quantity <= 0) throw new IllegalArgumentException("Số lượng nhập phải lớn hơn 0");
        List<ProductVariant> productVariants = variants.findByProductId(productId);
        ProductVariant variant = null;
        if (variantId != null) {
            variant = variants.findByIdWithPessimisticLock(variantId)
                    .filter(v -> v.getProduct() != null && productId.equals(v.getProduct().getId()))
                    .orElseThrow(() -> new IllegalArgumentException("Biến thể không thuộc sản phẩm đã chọn"));
        } else if (!productVariants.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn màu / size cần nhập");
        }
        String loc = blankToNull(location);
        Long sId = resolveShopId();
        if (sId == null) sId = 1L;
        Inventory i = inventories.findByProductIdWithLock(productId).orElseGet(Inventory::new);
        if (i.getId() == null) {
            // Sản phẩm chưa có dòng tồn kho: lấy tên từ catalog thay vì tin client.
            String name = products.findById(productId).map(Product::getName).orElse(blankToNull(productName));
            if (name == null) throw new IllegalArgumentException("Không tìm thấy sản phẩm " + productId);
            i.setProductId(productId); i.setProductName(name); i.setQuantityOnHand(0); i.setQuantityReserved(0); i.setReorderLevel(10);
            i.setShopId(sId);
        } else if (i.getShopId() == null) {
            i.setShopId(sId);
        } else {
            checkInventoryOwnership(i);
        }
        i.setQuantityOnHand(i.getQuantityOnHand() + quantity);
        if (loc != null) i.setWarehouseLocation(loc);
        Inventory saved = inventories.save(i);

        String variantLabel = null;
        if (variant != null) {
            variant.setStock((variant.getStock() != null ? variant.getStock() : 0) + quantity);
            variant.setAvailableQuantity((variant.getAvailableQuantity() != null ? variant.getAvailableQuantity() : 0) + quantity);
            variants.save(variant);
            ProductServiceImpl.invalidateListingCache();
            variantLabel = java.util.stream.Stream.of(variant.getColor(), variant.getSize())
                    .filter(s -> s != null && !s.isBlank())
                    .collect(java.util.stream.Collectors.joining(" / "));
        }

        GoodsReceipt receipt = new GoodsReceipt();
        receipt.setInventoryId(saved.getId());
        receipt.setProductId(saved.getProductId());
        receipt.setProductName(variantLabel == null || variantLabel.isEmpty()
                ? saved.getProductName() : saved.getProductName() + " (" + variantLabel + ")");
        receipt.setQuantity(quantity);
        receipt.setLocation(saved.getWarehouseLocation());
        receipt.setSupplier(resolveSupplierName(supplierId, sId));
        receipt.setNote(blankToNull(note));
        receipt.setShopId(saved.getShopId());
        receipt.setCreatedBy(resolveUserId());
        receipts.save(receipt);

        log.info("Inbound: product {} qty {} at location {} for shop {}", productId, quantity, loc, sId);
        return saved;
    }

    /** Danh mục sản phẩm rút gọn để chọn khi nhập kho, kể cả sản phẩm chưa có dòng tồn kho. */
    public record CatalogProduct(Long id, String name) {}

    @Transactional(readOnly = true)
    public List<CatalogProduct> getCatalogProducts() {
        return products.findAll(org.springframework.data.domain.Sort.by("name")).stream()
                .map(p -> new CatalogProduct(p.getId(), p.getName()))
                .toList();
    }

    public List<GoodsReceipt> getReceipts() {
        Long shopId = resolveShopId();
        return shopId == null ? receipts.findTop200ByOrderByCreatedAtDesc() : receipts.findTop200ByShopIdOrderByCreatedAtDesc(shopId);
    }

    public Map<String,Object> countInbound(Long inventoryId, Integer actualQuantity) {
        if (actualQuantity == null || actualQuantity < 0) throw new IllegalArgumentException("Số lượng kiểm đếm không hợp lệ");
        Inventory i = inventory(inventoryId);
        Map<String,Object> result = new LinkedHashMap<>();
        result.put("inventory", i);
        result.put("actualQuantity", actualQuantity);
        result.put("difference", actualQuantity - i.getQuantityOnHand());
        return result;
    }

    @Transactional
    public Inventory updateLocation(Long id, String location) {
        String loc = blankToNull(location);
        if (loc == null) throw new IllegalArgumentException("Vị trí kho không được để trống");
        Inventory i = inventory(id); i.setWarehouseLocation(loc); return inventories.save(i);
    }

    // ========== Inventory Adjustment Workflow ==========

    @Transactional
    public InventoryAdjustment createAdjustmentRequest(Long id, Integer difference, String reason) {
        String requesterUserId = resolveUserId();
        if (difference == null || difference == 0) throw new IllegalArgumentException("Chênh lệch phải là số nguyên khác 0");
        String cleanReason = blankToNull(reason);
        if (cleanReason == null) throw new IllegalArgumentException("Vui lòng nhập lý do điều chỉnh");
        Inventory target = inventory(id);
        if (target.getQuantityOnHand() + difference < 0) {
            throw new IllegalArgumentException("Điều chỉnh làm tồn kho âm (tồn hiện tại: " + target.getQuantityOnHand() + ")");
        }
        InventoryAdjustment a = new InventoryAdjustment();
        a.setInventory(target);
        a.setDifference(difference);
        a.setReason(cleanReason);
        a.setStatus("PENDING");
        log.info("Inventory adjustment requested: id {} diff {} reason {} requestedBy {}", id, difference, reason, requesterUserId);
        return adjustments.save(a);
    }

    @Transactional
    public InventoryAdjustment approveAdjustment(Long id) {
        String approverUserId = resolveUserId();
        InventoryAdjustment a = adjustments.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phiếu điều chỉnh"));

        // Every other method in this class resolves through inventory(id), which
        // checks shop ownership. This one went straight to the repository, so an
        // operator could approve another branch's adjustment by guessing its id.
        if (a.getInventory() != null) {
            checkInventoryOwnership(a.getInventory());
        }

        if (!"PENDING".equals(a.getStatus())) {
            throw new IllegalArgumentException("Phiếu điều chỉnh đã được xử lý");
        }
        
        Inventory i = inventories.findByIdWithLock(a.getInventory().getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tồn kho"));
        
        int next = i.getQuantityOnHand() + a.getDifference();
        if (next < 0) {
            throw new IllegalArgumentException("Điều chỉnh làm tồn kho âm");
        }
        
        i.setQuantityOnHand(next);
        inventories.save(i);
        // approvedBy used to come straight from the request body (a client
        // could stamp anyone's id on the approval). The column is Long while
        // User.id is a String, so there's no safe id to store here without a
        // schema change; log the real authenticated approver instead of
        // trusting client input.
        a.setStatus("APPROVED");

        log.info("Inventory adjustment approved: id {} new qty {} approvedBy {}", id, next, approverUserId);
        return adjustments.save(a);
    }

    // ========== Stock Reservation Operations ==========

    public List<StockReservation> getPendingReservations() { 
        Long shopId = resolveShopId();
        List<StockReservation> all = reservations.findByStatusOrderByCreatedAtAsc(ReservationStatus.PENDING); 
        return shopId == null ? all : all.stream().filter(r -> r.getOrder() != null && shopId.equals(r.getOrder().getShopId())).toList();
    }

    @Transactional
    public StockReservation approveReservation(Long id) {
        StockReservation r = reservation(id);
        if (r.getStatus() != ReservationStatus.PENDING) {
            throw new IllegalArgumentException("Yêu cầu giữ hàng đã được xử lý");
        }
        Inventory i = inventories.findByProductIdWithLock(r.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("Sản phẩm chưa có trong kho"));
        
        int available = i.getQuantityOnHand() - i.getQuantityReserved();
        if (available < r.getQuantity()) {
            throw new IllegalArgumentException("Không đủ tồn khả dụng để giữ hàng. Cần: " + r.getQuantity() + ", Còn: " + available);
        }

        // NOTE: this only records the approval; it deliberately does NOT touch
        // quantity_reserved. startPicking() reserves the order's items when picking
        // actually begins. Reserving here too double-counted the same stock against
        // one order under the old code.
        r.setStatus(ReservationStatus.APPROVED);
        reservations.save(r);

        // Approving a hold request is only meaningful while the order is still
        // waiting on it; route through the state machine instead of forcing
        // CONFIRMED directly, which used to let a cancelled/delivered order be
        // resurrected into CONFIRMED with no validation at all.
        Order order = r.getOrder();
        if (order.getStatus() != OrderStatus.CONFIRMED) {
            stateMachine.validateTransition(order.getStatus(), OrderStatus.CONFIRMED);
            OrderStatus oldStatus = order.getStatus();
            order.setStatus(OrderStatus.CONFIRMED);
            saveStatusHistory(order.getId(), oldStatus, OrderStatus.CONFIRMED, resolveUserId(), "Giữ hàng được duyệt");
        }
        orders.save(order);
        
        log.info("Reservation {} approved for order {}", id, order.getId());
        return r;
    }

    @Transactional
    public StockReservation rejectReservation(Long id, String reason) {
        StockReservation r = reservation(id);
        if (r.getStatus() != ReservationStatus.PENDING) {
            throw new IllegalArgumentException("Yêu cầu giữ hàng đã được xử lý");
        }
        String cleanReason = blankToNull(reason);
        if (cleanReason == null) throw new IllegalArgumentException("Vui lòng nhập lý do từ chối");
        r.setStatus(ReservationStatus.REJECTED);
        r.setRejectReason(cleanReason);
        log.info("Reservation {} rejected: {}", id, reason);
        return reservations.save(r);
    }

    // ========== Order Status Transitions (Warehouse) ==========

    /**
     * Start picking - transition from CONFIRMED to PICKING and reserve the stock.
     */
    @Transactional
    public WarehouseOrderDto startPicking(Long id) {
        Order order = order(id);
        String userId = resolveUserId();
        OrderStatus oldStatus = order.getStatus();

        transition(order, OrderStatus.PICKING);

        // Reserve stock for picking (fails the whole call if any line is short)
        reserveStockForPicking(order);

        saveStatusHistory(order.getId(), oldStatus, OrderStatus.PICKING, userId, "Bắt đầu lấy hàng");

        log.info("Order {} started picking by user {}", id, userId);
        return toDto(orders.save(order));
    }

    /**
     * Complete picking - transition from PICKING to PACKED. Goods physically leave
     * the shelf here: on-hand drops and the reservation startPicking created is
     * consumed. Without that, available stock (on_hand - reserved) would drain to
     * zero permanently.
     */
    @Transactional
    public WarehouseOrderDto completePicking(Long id) {
        return moveToPacked(id, "Hoàn thành lấy hàng, đóng gói");
    }

    /**
     * Pack order - the packing station's action. It is the same PICKING -> PACKED
     * transition as completePicking and must consume the reservation too; the old
     * standalone implementation skipped consumeReservedStock, leaving stock
     * reserved forever and on-hand never decremented.
     */
    @Transactional
    public WarehouseOrderDto packOrder(Long id) {
        return moveToPacked(id, "Đóng gói đơn hàng");
    }

    private WarehouseOrderDto moveToPacked(Long id, String reason) {
        Order order = order(id);
        String userId = resolveUserId();
        OrderStatus oldStatus = order.getStatus();

        transition(order, OrderStatus.PACKED);
        consumeReservedStock(order);
        saveStatusHistory(order.getId(), oldStatus, OrderStatus.PACKED, userId, reason);

        log.info("Order {} packed from {} by user {}", id, oldStatus, userId);
        return toDto(orders.save(order));
    }

    /**
     * Generate shipping label - requires PACKED status
     */
    @Transactional(readOnly = true)
    public Map<String,Object> generateShippingLabel(Long id) {
        Order order = order(id);
        if (order.getStatus() != OrderStatus.PACKED) {
            throw new IllegalArgumentException("Chỉ in tem sau khi đóng gói");
        }

        Map<String,Object> label = new LinkedHashMap<>();
        label.put("orderId", order.getId());
        label.put("orderCode", order.getOrderCode());
        label.put("receiver", order.getCustomerName() != null ? order.getCustomerName() : order.getCustomerEmail());
        label.put("phone", order.getPhone());
        label.put("address", order.getShippingAddress());
        label.put("paymentMethod", order.getPaymentMethod());
        label.put("codAmount", codAmountOf(order));
        label.put("itemCount", order.getItems() == null ? 0 : order.getItems().stream()
                .mapToInt(i -> i.getQuantity() == null ? 0 : i.getQuantity()).sum());
        return label;
    }

    /**
     * Ready to ship - transition from PACKED to HANDED_TO_CARRIER
     */
    @Transactional
    public WarehouseOrderDto readyToShip(Long id) {
        Order order = order(id);
        String userId = resolveUserId();

        // Verify all items are packed (additional validation)
        verifyAllItemsPacked(order);

        OrderStatus oldStatus = order.getStatus();
        transition(order, OrderStatus.HANDED_TO_CARRIER);
        saveStatusHistory(order.getId(), oldStatus, OrderStatus.HANDED_TO_CARRIER, userId, "Bàn giao cho đơn vị vận chuyển");

        log.info("Order {} handed to carrier by user {}", id, userId);
        return toDto(orders.save(order));
    }

    // ========== Stocktake Operations ==========

    public List<Stocktake> getStocktakes() {
        return getStocktakes(resolveShopId());
    }

    public List<Stocktake> getStocktakes(Long shopId) {
        return (shopId == null) ? stocktakes.findAll() : stocktakes.findByShopId(shopId);
    }

    /** createdBy from the client body is ignored: the id column is Long while User.id is a String. */
    @Transactional
    public Stocktake createStocktake(String location, Long createdBy) {
        String loc = blankToNull(location);
        if (loc == null) throw new IllegalArgumentException("Vui lòng nhập vị trí kho cần kiểm kê");
        Stocktake s = new Stocktake();
        s.setWarehouseLocation(loc);
        Long shopId = resolveShopId();
        s.setShopId(shopId != null ? shopId : 1L);
        log.info("Stocktake created at location {} by user {}", loc, resolveUserId());
        return stocktakes.save(s);
    }

    @Transactional
    public Stocktake updateStocktake(Long id, Integer actualQuantity) {
        if (actualQuantity == null || actualQuantity < 0) {
            throw new IllegalArgumentException("Số lượng kiểm đếm phải là số nguyên lớn hơn hoặc bằng 0");
        }
        Stocktake s = stocktakes.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phiếu kiểm kê"));
        // Same shop isolation every other method here applies; this one read the
        // repository directly, so any operator could overwrite another branch's count.
        Long shopId = resolveShopId();
        if (shopId != null && (s.getShopId() == null || !s.getShopId().equals(shopId))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền thao tác trên phiếu kiểm kê của cửa hàng khác");
        }
        if ("COMPLETED".equals(s.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Phiếu kiểm kê đã hoàn thành, không thể sửa");
        }
        s.setActualQuantity(actualQuantity);
        s.setStatus("COMPLETED");
        log.info("Stocktake {} completed with actual qty {}", id, actualQuantity);
        return stocktakes.save(s);
    }

    // ========== Replenishment ==========

    public List<Inventory> getReplenishmentSuggestions() {
        Long shopId = resolveShopId();
        return (shopId == null)
                ? inventories.findAllReplenishmentSuggestions()
                : inventories.findReplenishmentSuggestionsByShopId(shopId);
    }

    @Transactional
    public RestockRequest createRestockRequest(Long inventoryId, Integer quantity, String note) {
        if (quantity == null || quantity <= 0) throw new IllegalArgumentException("Số lượng đề xuất phải lớn hơn 0");
        Inventory inv = inventory(inventoryId);
        if (restockRequests.existsByInventoryIdAndStatus(inv.getId(), "PENDING")) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Sản phẩm này đã có đề xuất nhập đang chờ duyệt");
        }
        RestockRequest r = new RestockRequest();
        r.setInventoryId(inv.getId());
        r.setProductId(inv.getProductId());
        r.setProductName(inv.getProductName());
        r.setQuantity(quantity);
        r.setNote(blankToNull(note));
        r.setShopId(inv.getShopId());
        r.setRequestedBy(resolveUserId());
        log.info("Restock requested: inventory {} qty {}", inv.getId(), quantity);
        return restockRequests.save(r);
    }

    public List<RestockRequest> getRestockRequests() {
        Long shopId = resolveShopId();
        return shopId == null ? restockRequests.findTop200ByOrderByCreatedAtDesc() : restockRequests.findTop200ByShopIdOrderByCreatedAtDesc(shopId);
    }

    // ========== Order List ==========

    /**
     * Get orders that need warehouse processing: CONFIRMED, PICKING, PACKED
     */
    @Transactional(readOnly = true)
    public List<WarehouseOrderDto> getWarehouseOrders() {
        Long shopId = resolveShopId();
        List<OrderStatus> warehouseStatuses = List.of(OrderStatus.CONFIRMED, OrderStatus.PICKING, OrderStatus.PACKED);

        List<Order> list = shopId == null
                ? orders.findByStatusInOrderByCreatedAtDesc(warehouseStatuses)
                : orders.findByShopIdAndStatusInOrderByCreatedAtDesc(shopId, warehouseStatuses);
        return SalesOrderService.oldestFirst(list).stream().map(this::toDto).toList();
    }

    // ========== Private Helper Methods ==========

    private Inventory inventory(Long id) { 
        Inventory inv = inventories.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tồn kho " + id)); 
        checkInventoryOwnership(inv);
        return inv;
    }

    private StockReservation reservation(Long id) { 
        StockReservation res = reservations.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy yêu cầu giữ hàng " + id)); 
        if (res.getOrder() != null) checkOrderOwnership(res.getOrder());
        return res;
    }

    private Order order(Long id) { 
        Order o = orders.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng " + id)); 
        checkOrderOwnership(o);
        return o;
    }

    private void transition(Order order, OrderStatus to) {
        try {
            stateMachine.validateTransition(order.getStatus(), to);
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Đơn " + order.getOrderCode() + " đang ở trạng thái " + stateMachine.getStatusDisplayName(order.getStatus())
                            + ", không thể chuyển sang " + stateMachine.getStatusDisplayName(to));
        }
        order.setStatus(to);
    }

    /** Tiền shipper phải thu hộ: chỉ đơn COD chưa thu. Đơn chuyển khoản/quét mã (đã trả trước) = 0. */
    private static double codAmountOf(Order o) {
        boolean collect = "COD".equals(o.getPaymentMethod()) && "COD_PENDING".equals(o.getPaymentStatus());
        return collect && o.getTotal() != null ? o.getTotal() : 0.0;
    }

    /** Tên nhà cung cấp phải lấy từ danh sách chủ cửa hàng đã tạo (dùng chung hoặc của chi nhánh này). */
    private String resolveSupplierName(Long supplierId, Long shopId) {
        if (supplierId == null) return null;
        Supplier s = suppliers.findById(supplierId)
                .filter(x -> x.getDeletedAt() == null)
                .orElseThrow(() -> new IllegalArgumentException("Nhà cung cấp không tồn tại"));
        if (s.getShopId() != null && !s.getShopId().equals(shopId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nhà cung cấp không thuộc chi nhánh của bạn");
        }
        return s.getName();
    }

    private static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }

    private WarehouseOrderDto toDto(Order o) {
        List<OrderItem> items = o.getItems() == null ? List.of() : o.getItems();
        List<WarehouseOrderDto.Item> lines = items.stream().map(it -> {
            Long pid = it.getProduct() != null ? it.getProduct().getId() : null;
            Inventory inv = pid == null ? null : inventories.findByProductId(pid).orElse(null);
            String loc = inv == null ? null : inv.getWarehouseLocation();
            Integer available = null;
            if (o.getStatus() == OrderStatus.CONFIRMED) {
                available = inv == null ? 0 : inv.getQuantityOnHand() - inv.getQuantityReserved();
            }
            return new WarehouseOrderDto.Item(pid, it.getProductNameSnapshot(), it.getColorSnapshot(),
                    it.getSizeSnapshot(), it.getImageSnapshot(), it.getQuantity() == null ? 0 : it.getQuantity(), loc, available);
        }).toList();
        int count = lines.stream().mapToInt(WarehouseOrderDto.Item::quantity).sum();
        return new WarehouseOrderDto(o.getId(), o.getId(), o.getOrderCode(),
                o.getStatus() == null ? null : o.getStatus().name(),
                o.getCustomerName() != null ? o.getCustomerName() : o.getCustomerEmail(),
                o.getPhone(), o.getShippingAddress(), o.getPaymentMethod(), o.getTotal(),
                o.getPaymentStatus(), codAmountOf(o),
                o.getCreatedAt() == null ? null : o.getCreatedAt().toString(), count, lines);
    }

    /** Reserves every line or none: a short line aborts the transaction before any reservation is kept. */
    private void reserveStockForPicking(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            return;
        }

        for (OrderItem item : order.getItems()) {
            Inventory inventory = inventories.findByProductIdWithLock(item.getProduct().getId())
                    .orElse(null);
            int quantity = item.getQuantity() != null ? item.getQuantity() : 0;

            if (inventory == null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Sản phẩm \"" + item.getProductNameSnapshot() + "\" chưa có trong kho");
            }
            int available = inventory.getQuantityOnHand() - inventory.getQuantityReserved();
            if (available < quantity) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Không đủ tồn để lấy \"" + item.getProductNameSnapshot() + "\": cần " + quantity + ", khả dụng " + available);
            }
            inventory.setQuantityReserved(inventory.getQuantityReserved() + quantity);
            inventories.save(inventory);
            recordReservation(order, item.getProduct().getId(), quantity);
        }
    }

    /**
     * Ghi lại phần tồn đã giữ cho đơn. Hủy đơn (SalesOrderService.releaseReservations) chỉ nhả tồn
     * theo các bản ghi này, nên nếu thiếu thì hủy đơn đang lấy hàng sẽ làm tồn bị giữ vĩnh viễn.
     */
    private void recordReservation(Order order, Long productId, int quantity) {
        StockReservation r = reservations.findByOrderId(order.getId()).stream()
                .filter(x -> productId.equals(x.getProductId()) && x.getStatus() != ReservationStatus.REJECTED
                        && x.getStatus() != ReservationStatus.RELEASED)
                .findFirst().orElseGet(() -> {
                    StockReservation n = new StockReservation();
                    n.setOrder(order);
                    n.setProductId(productId);
                    return n;
                });
        r.setQuantity(quantity);
        r.setStatus(ReservationStatus.APPROVED);
        reservations.save(r);
    }

    /**
     * Consumes the reservation startPicking created: on_hand drops by the picked
     * quantity and reserved drops by the same amount, so available stock
     * (on_hand - reserved) is unchanged by picking itself but on_hand now reflects
     * that the goods have left the shelf. Never lets reserved go negative if a
     * partial/duplicate call happens.
     */
    private void consumeReservedStock(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            return;
        }
        for (OrderItem item : order.getItems()) {
            Inventory inventory = inventories.findByProductIdWithLock(item.getProduct().getId())
                    .orElse(null);
            if (inventory == null) {
                continue;
            }
            int quantity = item.getQuantity() != null ? item.getQuantity() : 0;
            inventory.setQuantityReserved(Math.max(0, inventory.getQuantityReserved() - quantity));
            inventory.setQuantityOnHand(Math.max(0, inventory.getQuantityOnHand() - quantity));
            inventories.save(inventory);
        }
        // Hàng đã rời kệ: bản ghi giữ hàng đã "dùng xong", hủy đơn sau đó không được nhả thêm lần nữa.
        for (StockReservation r : reservations.findByOrderId(order.getId())) {
            if (r.getStatus() == ReservationStatus.APPROVED) {
                r.setStatus(ReservationStatus.RELEASED);
                reservations.save(r);
            }
        }
    }

    private void verifyAllItemsPacked(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn hàng không có sản phẩm nào");
        }
        // Additional verification can be added here (e.g., check picking list completion)
    }

    private void saveStatusHistory(Long orderId, OrderStatus from, OrderStatus to, String userId, String reason) {
        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrderId(orderId);
        history.setFromStatus(from != null ? from.name() : null);
        history.setStatus(to.name());
        history.setChangedBy(userId);
        history.setReason(reason);
        historyRepository.save(history);
    }
}
