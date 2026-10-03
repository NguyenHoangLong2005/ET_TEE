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

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class SalesOrderService {
    private static final Logger log = LoggerFactory.getLogger(SalesOrderService.class);
    
    private final OrderRepository orders;
    private final OrderNoteRepository notes;
    private final StockReservationRepository reservations;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final OrderStateMachine stateMachine;
    private final OrderStatusHistoryRepository historyRepository;
    private final InventoryRepository inventoryRepository;
    private final ProductVariantRepository variantRepository;

    public SalesOrderService(
            OrderRepository orders, 
            OrderNoteRepository notes, 
            StockReservationRepository reservations, 
            ProductRepository productRepository, 
            UserRepository userRepository,
            OrderStateMachine stateMachine,
            OrderStatusHistoryRepository historyRepository,
            InventoryRepository inventoryRepository,
            ProductVariantRepository variantRepository) {
        this.orders = orders;
        this.notes = notes;
        this.reservations = reservations;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.stateMachine = stateMachine;
        this.historyRepository = historyRepository;
        this.inventoryRepository = inventoryRepository;
        this.variantRepository = variantRepository;
    }

    private Long resolveShopId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
        if (isAdmin) return null;
        String name = auth.getName();
        User user = userRepository.findByEmail(name).orElse(null);
        if (user == null) {
            user = userRepository.findById(name).orElse(null);
        }
        if (user != null && user.getShopId() != null) {
            return user.getShopId();
        }
        return 1L;
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

    private void checkOrderOwnership(Order order) {
        Long shopId = resolveShopId();
        if (shopId != null && (order.getShopId() == null || !order.getShopId().equals(shopId))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền thao tác trên đơn hàng của cửa hàng khác");
        }
    }

    private static final List<OrderStatus> PENDING_SALES_STATUSES =
            List.of(OrderStatus.PENDING_PAYMENT, OrderStatus.PENDING_CONFIRMATION);

    public List<Order> getAllOrders() { 
        Long shopId = resolveShopId();
        return shopId == null ? orders.findAllByOrderByCreatedAtDesc() : orders.findByShopIdOrderByCreatedAtDesc(shopId); 
    }

    public List<Order> getNewOrders() {
        Long shopId = resolveShopId();
        return shopId == null ? orders.findByStatusInOrderByCreatedAtDesc(PENDING_SALES_STATUSES) : orders.findByShopIdAndStatusInOrderByCreatedAtDesc(shopId, PENDING_SALES_STATUSES);
    }

    public Order getOrder(Long id) { 
        Order order = orders.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng " + id)); 
        checkOrderOwnership(order);
        return order;
    }
    
    public List<OrderNote> getOrderNotes(Long id) { getOrder(id); return notes.findByOrderIdOrderByCreatedAtDesc(id); }

    @Transactional
    public Order verifyOrder(Long id, String name, String phone, String address) {
        Order order = getOrder(id);
        if (!PENDING_SALES_STATUSES.contains(order.getStatus())) throw new IllegalArgumentException("Chỉ xác minh được đơn đang chờ xác nhận");
        if (name != null && !name.isBlank()) order.setCustomerName(name.trim());
        // Guard every field: an update carrying only a name used to null the
        // customer's phone and shipping address on a live order.
        if (phone != null && !phone.isBlank()) order.setPhone(phone.trim());
        if (address != null && !address.isBlank()) order.setShippingAddress(address.trim());
        order.setUpdatedAt(LocalDateTime.now());
        return orders.save(order);
    }

    @Transactional
    public Order confirmOrder(Long id) {
        Order order = getOrder(id);
        String userId = resolveUserId();
        
        stateMachine.validateTransition(order.getStatus(), OrderStatus.CONFIRMED);
        validateInventoryForConfirmation(order);
        
        OrderStatus oldStatus = order.getStatus();
        order.setStatus(OrderStatus.CONFIRMED);
        order.setUpdatedAt(LocalDateTime.now());
        
        saveStatusHistory(order.getId(), oldStatus, OrderStatus.CONFIRMED, userId, "Xác nhận đơn hàng");
        
        log.info("Order {} confirmed from {} to {} by user {}", id, oldStatus, OrderStatus.CONFIRMED, userId);
        return orders.save(order);
    }

    @Transactional
    public Order cancelOrder(Long id, String reason) {
        Order order = getOrder(id);
        String userId = resolveUserId();
        
        stateMachine.validateCancellation(order.getStatus());
        
        OrderStatus oldStatus = order.getStatus();
        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelReason(reason != null ? reason : "Khách hủy đơn");
        order.setUpdatedAt(LocalDateTime.now());
        
        releaseReservations(order);
        restoreVariantStock(order);
        saveStatusHistory(order.getId(), oldStatus, OrderStatus.CANCELLED, userId, reason);
        
        log.info("Order {} cancelled from {} by user {}", id, oldStatus, userId);
        return orders.save(order);
    }

    /**
     * Checkout (OrderService) decrements product_variants.stock/available_quantity
     * for every item it sells. Cancellation used to release the warehouse-side
     * inventories.quantity_reserved but never gave that stock back to the variant,
     * so every cancelled order permanently destroyed sellable inventory. This
     * restores exactly what checkout took, using the same row lock checkout uses
     * to avoid racing a concurrent purchase of the same variant.
     */
    private void restoreVariantStock(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            return;
        }
        for (OrderItem item : order.getItems()) {
            Long variantId = item.getVariantId();
            if (variantId == null || variantId == 0L) {
                continue;
            }
            int quantity = item.getQuantity() != null ? item.getQuantity() : 0;
            if (quantity <= 0) {
                continue;
            }
            variantRepository.findByIdWithPessimisticLock(variantId).ifPresent(variant -> {
                variant.setStock(variant.getStock() + quantity);
                variant.setAvailableQuantity(variant.getAvailableQuantity() + quantity);
                variantRepository.save(variant);
            });
        }
    }

    public OrderNote addNote(Long orderId, String content, String userId) {
        if (content == null || content.isBlank()) throw new IllegalArgumentException("Nội dung ghi chú không được để trống");
        OrderNote note = new OrderNote();
        note.setOrder(getOrder(orderId));
        note.setContent(content.trim());
        note.setCreatedBy(userId);
        return notes.save(note);
    }

    @Transactional
    public StockReservation requestReservation(Long orderId, Long productId, Integer quantity) {
        Order order = getOrder(orderId);
        String userId = resolveUserId();
        
        if (order.getStatus() != OrderStatus.CONFIRMED) {
            throw new IllegalArgumentException("Đơn phải ở trạng thái CONFIRMED trước khi yêu cầu giữ hàng");
        }
        if (quantity == null || quantity <= 0) throw new IllegalArgumentException("Số lượng giữ phải lớn hơn 0");
        
        StockReservation r = new StockReservation();
        r.setOrder(order);
        r.setProductId(productId);
        r.setQuantity(quantity);
        r.setStatus(ReservationStatus.PENDING);
        
        log.info("Stock reservation requested for order {} product {} qty {} by user {}", 
                orderId, productId, quantity, userId);
        
        return reservations.save(r);
    }

    public List<Order> getSlaWarningOrders() {
        LocalDateTime limit = LocalDateTime.now().plusHours(2);
        Long shopId = resolveShopId();
        List<Order> all = shopId == null ? orders.findAllByOrderByCreatedAtDesc() : orders.findByShopIdOrderByCreatedAtDesc(shopId);
        return all.stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED && o.getStatus() != OrderStatus.DELIVERED)
                .filter(o -> o.getSlaDeadline() != null && !o.getSlaDeadline().isAfter(limit))
                .toList();
    }

    public List<OrderStatus> getAllowedTransitions(Long id) {
        Order order = getOrder(id);
        return new ArrayList<>(stateMachine.getAllowedTransitions(order.getStatus()));
    }

    public OrderStatusInfo getStatusInfo(Long id) {
        Order order = getOrder(id);
        OrderStatus currentStatus = order.getStatus();
        return new OrderStatusInfo(
                currentStatus,
                stateMachine.getStatusDisplayName(currentStatus),
                stateMachine.getStatusColor(currentStatus),
                stateMachine.canCancel(currentStatus),
                stateMachine.isCompleted(currentStatus),
                new ArrayList<>(stateMachine.getAllowedTransitions(currentStatus))
        );
    }

    public List<OrderStatusHistory> getOrderStatusHistory(Long orderId) {
        // getOrder() enforces shop ownership. Querying the repository directly
        // exposed any branch's full status trail, including actor ids, by id.
        getOrder(orderId);
        return historyRepository.findByOrderIdOrderByCreatedAtAsc(orderId);
    }

    @Transactional
    public Order createSalesOrder(java.util.Map<String, Object> payload) {
        String customerName = (String) payload.get("customerName");
        String customerEmail = (String) payload.get("customerEmail");
        String phone = (String) payload.get("phone");
        String shippingAddress = (String) payload.get("shippingAddress");
        String paymentMethod = (String) payload.get("paymentMethod");
        Number total = (Number) payload.get("total");

        if (customerName == null || customerName.trim().isEmpty() || phone == null || phone.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên khách hàng và số điện thoại không được để trống");
        }

        Order order = new Order();
        String code = "ORD-" + System.currentTimeMillis() + "-" + (int)(Math.random() * 900 + 100);
        order.setOrderCode(code);
        order.setCustomerName(customerName.trim());
        order.setCustomerEmail(customerEmail != null && !customerEmail.isBlank() ? customerEmail.trim() : "pos-customer@et.tee");
        order.setCustomerPhone(phone.trim());
        order.setShippingAddressSnapshot(shippingAddress != null && !shippingAddress.isBlank() ? shippingAddress.trim() : "Tại quầy (POS)");
        order.setPaymentMethod(paymentMethod != null ? paymentMethod : "CASH");
        order.setPaymentStatus("PAID");
        order.setStatus(OrderStatus.CONFIRMED);
        order.setOrderStatus(OrderStatus.CONFIRMED.name());
        order.setTotalAmount(total != null ? total.doubleValue() : 0.0);
        order.setShopId(resolveShopId() != null ? resolveShopId() : 1L);
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());

        Order saved = orders.save(order);
        saveStatusHistory(saved.getId(), null, OrderStatus.CONFIRMED, resolveUserId(), "Tạo đơn hàng tại quầy (POS)");
        return saved;
    }

    private void validateInventoryForConfirmation(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            return;
        }
        
        for (OrderItem item : order.getItems()) {
            Inventory inventory = inventoryRepository.findByProductId(item.getProduct().getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Không tìm thấy inventory cho sản phẩm: " + item.getProduct().getName()));
            
            int availableStock = inventory.getQuantityOnHand() - inventory.getQuantityReserved();
            if (item.getQuantity() > availableStock) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        String.format("Sản phẩm '%s' không đủ hàng. Yêu cầu: %d, Còn lại: %d",
                                item.getProduct().getName(), item.getQuantity(), availableStock));
            }
        }
    }

    private void releaseReservations(Order order) {
        List<StockReservation> orderReservations = reservations.findByOrderId(order.getId());
        
        for (StockReservation reservation : orderReservations) {
            Inventory inventory = inventoryRepository.findByProductId(reservation.getProductId())
                    .orElse(null);
            
            if (inventory != null) {
                int newReserved = Math.max(0, inventory.getQuantityReserved() - reservation.getQuantity());
                inventory.setQuantityReserved(newReserved);
                inventoryRepository.save(inventory);
            }
            
            reservation.setStatus(ReservationStatus.RELEASED);
            reservations.save(reservation);
        }
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

    public record OrderStatusInfo(
            OrderStatus currentStatus,
            String displayName,
            String colorClass,
            boolean canCancel,
            boolean isCompleted,
            List<OrderStatus> allowedTransitions
    ) {}
}
