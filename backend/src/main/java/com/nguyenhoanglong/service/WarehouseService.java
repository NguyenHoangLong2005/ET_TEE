package com.nguyenhoanglong.service;

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

    public WarehouseService(
            InventoryRepository inventories, 
            StockReservationRepository reservations, 
            OrderRepository orders,
            InventoryAdjustmentRepository adjustments, 
            StocktakeRepository stocktakes, 
            UserRepository userRepository,
            OrderStateMachine stateMachine,
            OrderStatusHistoryRepository historyRepository) {
        this.inventories = inventories;
        this.reservations = reservations;
        this.orders = orders;
        this.adjustments = adjustments;
        this.stocktakes = stocktakes;
        this.userRepository = userRepository;
        this.stateMachine = stateMachine;
        this.historyRepository = historyRepository;
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
        List<Inventory> all = inventories.findAll();
        return shopId == null ? all : all.stream().filter(i -> shopId.equals(i.getShopId())).toList();
    }

    public List<InventoryAdjustment> getAdjustments() { 
        Long shopId = resolveShopId();
        List<InventoryAdjustment> all = adjustments.findAll();
        return shopId == null ? all : all.stream().filter(a -> a.getInventory() != null && shopId.equals(a.getInventory().getShopId())).toList();
    }

    @Transactional
    public Inventory inbound(Long productId, String productName, Integer quantity, String location) {
        if (quantity == null || quantity <= 0) throw new IllegalArgumentException("Số lượng nhập phải lớn hơn 0");
        Long sId = resolveShopId();
        if (sId == null) sId = 1L;
        Inventory i = inventories.findByProductIdWithLock(productId).orElseGet(Inventory::new);
        if (i.getId() == null) {
            i.setProductId(productId); i.setProductName(productName); i.setQuantityOnHand(0); i.setQuantityReserved(0); i.setReorderLevel(10);
            i.setShopId(sId);
        } else if (i.getShopId() == null) {
            i.setShopId(sId);
        }
        i.setQuantityOnHand(i.getQuantityOnHand() + quantity);
        i.setWarehouseLocation(location);
        log.info("Inbound: product {} qty {} at location {} for shop {}", productId, quantity, location, sId);
        return inventories.save(i);
    }

    public Map<String,Object> countInbound(Long inventoryId, Integer actualQuantity) {
        Inventory i = inventory(inventoryId);
        Map<String,Object> result = new LinkedHashMap<>();
        result.put("inventory", i);
        result.put("actualQuantity", actualQuantity);
        result.put("difference", actualQuantity - i.getQuantityOnHand());
        return result;
    }

    public Inventory updateLocation(Long id, String location) {
        Inventory i = inventory(id); i.setWarehouseLocation(location); return inventories.save(i);
    }

    // ========== Inventory Adjustment Workflow ==========

    @Transactional
    public InventoryAdjustment createAdjustmentRequest(Long id, Integer difference, String reason) {
        String requesterUserId = resolveUserId();
        InventoryAdjustment a = new InventoryAdjustment();
        a.setInventory(inventory(id));
        a.setDifference(difference);
        a.setReason(reason);
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
        r.setStatus(ReservationStatus.REJECTED); 
        r.setRejectReason(reason); 
        log.info("Reservation {} rejected: {}", id, reason);
        return reservations.save(r);
    }

    // ========== Order Status Transitions (Warehouse) ==========

    /**
     * Start picking - transition from CONFIRMED to PICKING
     */
    @Transactional
    public Order startPicking(Long id) {
        Order order = order(id);
        String userId = resolveUserId();
        
        // Validate transition
        stateMachine.validateTransition(order.getStatus(), OrderStatus.PICKING);
        
        OrderStatus oldStatus = order.getStatus();
        order.setStatus(OrderStatus.PICKING);
        
        // Reserve stock for picking
        reserveStockForPicking(order);
        
        // Record history
        saveStatusHistory(order.getId(), oldStatus, OrderStatus.PICKING, userId, "Bắt đầu lấy hàng");
        
        log.info("Order {} started picking from {} by user {}", id, oldStatus, userId);
        return orders.save(order);
    }

    /**
     * Complete picking - transition from PICKING to PACKED
     */
    @Transactional
    public Order completePicking(Long id) {
        Order order = order(id);
        String userId = resolveUserId();
        
        // Validate transition
        stateMachine.validateTransition(order.getStatus(), OrderStatus.PACKED);
        
        OrderStatus oldStatus = order.getStatus();
        order.setStatus(OrderStatus.PACKED);
        
        // Goods physically leave the shelf here: this is where on-hand actually
        // drops and the reservation startPicking created is consumed. Previously
        // nothing ever cleared quantity_reserved after startPicking added to it,
        // so available stock (on_hand - reserved) drained to zero permanently.
        consumeReservedStock(order);

        // Record history
        saveStatusHistory(order.getId(), oldStatus, OrderStatus.PACKED, userId, "Hoàn thành lấy hàng, đóng gói");
        
        log.info("Order {} completed picking from {} by user {}", id, oldStatus, userId);
        return orders.save(order);
    }

    /**
     * Pack order - explicit packing action
     */
    @Transactional
    public Order packOrder(Long id) {
        Order order = order(id);
        String userId = resolveUserId();
        
        if (order.getStatus() != OrderStatus.PICKING) {
            throw new IllegalArgumentException("Đơn phải đang ở trạng thái PICKING trước khi đóng gói");
        }
        
        OrderStatus oldStatus = order.getStatus();
        order.setStatus(OrderStatus.PACKED);
        
        // Record history
        saveStatusHistory(order.getId(), oldStatus, OrderStatus.PACKED, userId, "Đóng gói đơn hàng");
        
        log.info("Order {} packed from {} by user {}", id, oldStatus, userId);
        return orders.save(order);
    }

    /**
     * Generate shipping label - requires PACKED status
     */
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
        label.put("codAmount", order.getTotal());
        return label;
    }

    /**
     * Ready to ship - transition from PACKED to HANDED_TO_CARRIER
     */
    @Transactional
    public Order readyToShip(Long id) {
        Order order = order(id);
        String userId = resolveUserId();
        
        // Validate transition
        stateMachine.validateTransition(order.getStatus(), OrderStatus.HANDED_TO_CARRIER);
        
        // Verify all items are packed (additional validation)
        verifyAllItemsPacked(order);
        
        OrderStatus oldStatus = order.getStatus();
        order.setStatus(OrderStatus.HANDED_TO_CARRIER);
        
        // Record history
        saveStatusHistory(order.getId(), oldStatus, OrderStatus.HANDED_TO_CARRIER, userId, "Bàn giao cho đơn vị vận chuyển");
        
        log.info("Order {} handed to carrier from {} by user {}", id, oldStatus, userId);
        return orders.save(order);
    }

    // ========== Stocktake Operations ==========

    public List<Stocktake> getStocktakes() {
        return getStocktakes(resolveShopId());
    }

    public List<Stocktake> getStocktakes(Long shopId) {
        return (shopId == null) ? stocktakes.findAll() : stocktakes.findByShopId(shopId);
    }

    @Transactional
    public Stocktake createStocktake(String location, Long createdBy) {
        Stocktake s = new Stocktake();
        s.setWarehouseLocation(location);
        s.setCreatedBy(createdBy);
        Long shopId = resolveShopId();
        s.setShopId(shopId != null ? shopId : 1L);
        log.info("Stocktake created at location {} by user {}", location, createdBy);
        return stocktakes.save(s);
    }

    @Transactional
    public Stocktake updateStocktake(Long id, Integer actualQuantity) {
        Stocktake s = stocktakes.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phiếu kiểm kê"));
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

    // ========== Order List ==========

    /**
     * Get orders that need warehouse processing: CONFIRMED, PICKING, PACKED
     */
    public List<Order> getWarehouseOrders() {
        Long shopId = resolveShopId();
        List<OrderStatus> warehouseStatuses = List.of(OrderStatus.CONFIRMED, OrderStatus.PICKING, OrderStatus.PACKED);
        
        return shopId == null 
                ? orders.findByStatusInOrderByCreatedAtDesc(warehouseStatuses)
                : orders.findByShopIdAndStatusInOrderByCreatedAtDesc(shopId, warehouseStatuses);
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

    private void reserveStockForPicking(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            return;
        }
        
        for (OrderItem item : order.getItems()) {
            Inventory inventory = inventories.findByProductIdWithLock(item.getProduct().getId())
                    .orElse(null);
            
            if (inventory != null) {
                int newReserved = inventory.getQuantityReserved() + item.getQuantity();
                inventory.setQuantityReserved(newReserved);
                inventories.save(inventory);
            }
        }
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
