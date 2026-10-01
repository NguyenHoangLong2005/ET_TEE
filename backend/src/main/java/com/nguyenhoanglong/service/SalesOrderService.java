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
    private final MarketingService marketingService;
    private final SoldCountService soldCountService;
    private final OrderStockService orderStockService;

    public SalesOrderService(
            OrderRepository orders, 
            OrderNoteRepository notes, 
            StockReservationRepository reservations, 
            ProductRepository productRepository, 
            UserRepository userRepository,
            OrderStateMachine stateMachine,
            OrderStatusHistoryRepository historyRepository,
            InventoryRepository inventoryRepository,
            ProductVariantRepository variantRepository,
            MarketingService marketingService,
            SoldCountService soldCountService,
            OrderStockService orderStockService) {
        this.orders = orders;
        this.notes = notes;
        this.reservations = reservations;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.stateMachine = stateMachine;
        this.historyRepository = historyRepository;
        this.inventoryRepository = inventoryRepository;
        this.variantRepository = variantRepository;
        this.marketingService = marketingService;
        this.soldCountService = soldCountService;
        this.orderStockService = orderStockService;
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
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không xác định được người dùng hiện tại");
        }
        if (user.getShopId() == null) {
            // Silently defaulting an unassigned staff account to shop 1 let
            // them see and act on shop 1's orders even though they were
            // never actually assigned there. Fail closed instead.
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

    private void checkOrderOwnership(Order order) {
        Long shopId = resolveShopId();
        if (shopId != null && (order.getShopId() == null || !order.getShopId().equals(shopId))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền thao tác trên đơn hàng của cửa hàng khác");
        }
    }

    private static final List<OrderStatus> PENDING_SALES_STATUSES =
            List.of(OrderStatus.PENDING_PAYMENT, OrderStatus.PENDING_CONFIRMATION);
    // Chi don da thanh toan / cho xac nhan moi xac nhan duoc; PENDING_PAYMENT dang cho khach tra tien.
    private static final List<OrderStatus> CONFIRMABLE_STATUSES = List.of(OrderStatus.PENDING_CONFIRMATION);
    // Nhan vien ban hang chi huy don truoc khi don sang khau kho.
    private static final List<OrderStatus> SALES_CANCELLABLE_STATUSES =
            List.of(OrderStatus.PENDING_PAYMENT, OrderStatus.PENDING_CONFIRMATION, OrderStatus.CONFIRMED);
    private static final java.util.Set<String> POS_PAYMENT_METHODS =
            java.util.Set.of("CASH", "COD", "BANK_TRANSFER", "MOMO", "CARD");

    public List<Order> getAllOrders() { 
        Long shopId = resolveShopId();
        return shopId == null ? orders.findAllByOrderByCreatedAtDesc() : orders.findByShopIdOrderByCreatedAtDesc(shopId); 
    }

    /** Du lieu dashboard: thong ke bang COUNT/SUM o DB + toi da vai don can hien thi (khong tai toan bo don). */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getDashboardSummary() {
        Long shopId = resolveShopId();
        LocalDateTime startOfDay = java.time.LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        List<Object[]> overall = shopId == null ? orders.aggregateByStatusAll() : orders.aggregateByStatusForShop(shopId);
        List<Object[]> today = shopId == null
                ? orders.aggregateByStatusAllBetween(startOfDay, endOfDay)
                : orders.aggregateByStatusForShopBetween(shopId, startOfDay, endOfDay);

        java.util.Map<String, Long> countByStatus = new java.util.LinkedHashMap<>();
        double deliveredRevenue = 0;
        for (Object[] row : overall) {
            if (row[0] == null) continue;
            String st = String.valueOf(row[0]);
            countByStatus.put(st, ((Number) row[1]).longValue());
            if ("DELIVERED".equals(st)) deliveredRevenue = ((Number) row[2]).doubleValue();
        }
        long todayCount = 0;
        double todayRevenue = 0;
        for (Object[] row : today) {
            if (row[0] == null) continue;
            todayCount += ((Number) row[1]).longValue();
            if ("DELIVERED".equals(String.valueOf(row[0]))) todayRevenue += ((Number) row[2]).doubleValue();
        }

        // SLA chi ap dung cho don dang cho xac nhan.
        List<OrderStatus> excluded = java.util.Arrays.stream(OrderStatus.values())
                .filter(st -> st != OrderStatus.PENDING_CONFIRMATION).toList();
        LocalDateTime slaLimit = LocalDateTime.now().plusHours(2);
        long slaCount = shopId == null
                ? orders.countSlaWarningAll(slaLimit, excluded)
                : orders.countSlaWarningForShop(shopId, slaLimit, excluded);

        org.springframework.data.domain.Pageable oldestFirst = org.springframework.data.domain.PageRequest.of(
                0, 6, org.springframework.data.domain.Sort.by("createdAt").ascending());
        List<Order> urgent = (shopId == null
                ? orders.findByStatusIn(CONFIRMABLE_STATUSES, oldestFirst)
                : orders.findByShopIdAndStatusIn(shopId, CONFIRMABLE_STATUSES, oldestFirst)).getContent();

        org.springframework.data.domain.Pageable newestFirst = org.springframework.data.domain.PageRequest.of(
                0, 8, org.springframework.data.domain.Sort.by("createdAt").descending());
        List<Order> recent = (shopId == null
                ? orders.findAll(newestFirst)
                : orders.findByShopId(shopId, newestFirst)).getContent();

        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("countByStatus", countByStatus);
        result.put("totalOrders", countByStatus.values().stream().mapToLong(Long::longValue).sum());
        result.put("todayCount", todayCount);
        // Doanh thu la so lieu nhay cam: chi chu shop / admin moi duoc nhan tu API.
        if (isManagerRole()) {
            result.put("deliveredRevenue", deliveredRevenue);
            result.put("todayRevenue", todayRevenue);
        }
        result.put("slaWarningCount", slaCount);
        result.put("urgentOrders", urgent.stream().map(this::toDashboardRow).toList());
        result.put("recentOrders", recent.stream().map(this::toDashboardRow).toList());
        return result;
    }

    /** Danh sach don phan trang cho man hinh xu ly don: filter = all | new | sla; q = ma don / ten / SDT. */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getOrdersPage(int page, int size, String filter, String q) {
        Long shopId = resolveShopId();
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);

        String mode = filter == null ? "all" : filter.trim().toLowerCase();
        boolean slaOnly = "sla".equals(mode);
        List<OrderStatus> statuses;
        if ("new".equals(mode)) {
            statuses = PENDING_SALES_STATUSES;
        } else if (slaOnly) {
            statuses = CONFIRMABLE_STATUSES;
        } else {
            statuses = java.util.Arrays.asList(OrderStatus.values());
        }

        String keyword = q == null ? "" : q.trim().toLowerCase();
        String search = "%" + keyword.replace("\\", "").replace("%", "").replace("_", "") + "%";
        LocalDateTime slaLimit = LocalDateTime.now().plusHours(2);

        // Hang doi (cho xu ly / canh bao SLA): don cu nhat len truoc de xu ly theo thu tu den.
        // "Tat ca don" la danh sach tra cuu: moi nhat len truoc.
        org.springframework.data.domain.Sort sort = ("new".equals(mode) || slaOnly)
                ? org.springframework.data.domain.Sort.by("createdAt").ascending().and(org.springframework.data.domain.Sort.by("id").ascending())
                : org.springframework.data.domain.Sort.by("createdAt").descending().and(org.springframework.data.domain.Sort.by("id").descending());
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                safePage, safeSize, sort);
        org.springframework.data.domain.Page<Order> result = shopId == null
                ? orders.searchSalesOrdersAll(statuses, slaOnly, slaLimit, search, pageable)
                : orders.searchSalesOrdersForShop(shopId, statuses, slaOnly, slaLimit, search, pageable);

        java.util.Map<String, Object> body = new java.util.LinkedHashMap<>();
        java.util.Map<Long, Long> noteCounts = new java.util.HashMap<>();
        List<Long> pageIds = result.getContent().stream().map(Order::getId).toList();
        if (!pageIds.isEmpty()) {
            for (Object[] row : notes.countByOrderIds(pageIds)) {
                noteCounts.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
            }
        }
        body.put("content", result.getContent().stream().map(o -> {
            java.util.Map<String, Object> m = toDashboardRow(o);
            m.put("noteCount", noteCounts.getOrDefault(o.getId(), 0L));
            m.put("phone", o.getPhone());
            m.put("shippingAddress", o.getShippingAddress());
            m.put("customerEmail", o.getCustomerEmail());
            m.put("paymentMethod", o.getPaymentMethod());
            m.put("total", o.getTotalAmount());
            return m;
        }).toList());
        body.put("totalElements", result.getTotalElements());
        body.put("totalPages", result.getTotalPages());
        body.put("number", result.getNumber());
        body.put("size", result.getSize());
        return body;
    }

    private boolean isManagerRole() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return false;
        return auth.getAuthorities().stream().anyMatch(a -> {
            String name = a.getAuthority();
            return name.equals("ROLE_ADMIN") || name.equals("ADMIN")
                    || name.equals("ROLE_SHOP_OWNER") || name.equals("SHOP_OWNER")
                    || name.equals("VIEW_SHOP_DASHBOARD");
        });
    }

    private java.util.Map<String, Object> toDashboardRow(Order o) {
        java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id", o.getId());
        m.put("orderCode", o.getOrderCode());
        m.put("customerName", o.getCustomerName());
        m.put("totalAmount", o.getTotalAmount());
        m.put("status", o.getStatus() != null ? o.getStatus().name() : null);
        m.put("paymentStatus", o.getPaymentStatus());
        m.put("createdAt", o.getCreatedAt());
        m.put("slaDeadline", o.getSlaDeadline());
        return m;
    }

    public List<Order> getNewOrders() {
        Long shopId = resolveShopId();
        List<Order> list = shopId == null ? orders.findByStatusInOrderByCreatedAtDesc(PENDING_SALES_STATUSES) : orders.findByShopIdAndStatusInOrderByCreatedAtDesc(shopId, PENDING_SALES_STATUSES);
        return oldestFirst(list);
    }

    /** Hang doi xu ly: don cu nhat truoc (FIFO), cung thoi diem thi theo id. */
    static List<Order> oldestFirst(List<Order> list) {
        return list.stream()
                .sorted(java.util.Comparator.comparing(Order::getCreatedAt, java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder()))
                        .thenComparing(Order::getId, java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())))
                .toList();
    }

    public Order getOrder(Long id) { 
        Order order = orders.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng " + id)); 
        checkOrderOwnership(order);
        return order;
    }
    
    public List<OrderNote> getOrderNotes(Long id) { getOrder(id); return notes.findByOrderIdOrderByCreatedAtDesc(id); }

    /** Ghi chu dang gon (khong keo theo entity Order) de tra ve frontend. */
    public List<java.util.Map<String, Object>> getOrderNoteRows(Long id) {
        return getOrderNotes(id).stream().map(n -> {
            java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", n.getId());
            m.put("content", n.getContent());
            m.put("createdBy", n.getCreatedBy());
            m.put("createdAt", n.getCreatedAt());
            return m;
        }).toList();
    }

    /**
     * Nhan vien ban hang chi duoc xac nhan hoac huy don; cac buoc kho / van chuyen
     * (dong goi, giao hang, hoan tien...) thuoc bo phan khac.
     */
    @Transactional
    public Order changeStatusBySales(Long id, String targetStatus, String reason) {
        OrderStatus target;
        try {
            target = OrderStatus.valueOf(targetStatus == null ? "" : targetStatus.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái không hợp lệ: " + targetStatus);
        }
        return switch (target) {
            case CONFIRMED -> confirmOrder(id);
            case CANCELLED -> cancelOrder(id, reason);
            // Xu ly yeu cau tra hang cua khach (khach gui tu trang don hang).
            case RETURNED -> resolveReturn(id, true, reason);
            case DELIVERED -> resolveReturn(id, false, reason);
            case REFUNDED -> markRefunded(id, reason);
            default -> throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Nhân viên bán hàng chỉ được xác nhận, hủy đơn hoặc xử lý trả hàng. Các bước kho/vận chuyển do bộ phận tương ứng xử lý.");
        };
    }

    /**
     * Duyet (hang ve kho, cho hoan tien) hoac tu choi (don tro lai DELIVERED)
     * mot yeu cau tra hang.
     */
    @Transactional
    public Order resolveReturn(Long id, boolean approve, String reason) {
        Order order = getOrder(id);
        if (order.getStatus() != OrderStatus.RETURN_REQUESTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn hàng không có yêu cầu trả hàng đang chờ xử lý");
        }
        OrderStatus target = approve ? OrderStatus.RETURNED : OrderStatus.DELIVERED;
        if (!approve && (reason == null || reason.isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập lý do từ chối trả hàng");
        }
        stateMachine.validateTransition(order.getStatus(), target);

        order.setStatus(target);
        order.setUpdatedAt(LocalDateTime.now());
        if (approve) {
            orderStockService.restoreVariantStock(order);
            orderStockService.restoreWarehouseOnHand(order, OrderStatus.RETURN_REQUESTED);
            soldCountService.syncForStatus(order, target);
            String paid = order.getPaymentStatus();
            if ("PAID".equalsIgnoreCase(paid) || "COD_COLLECTED".equalsIgnoreCase(paid)) {
                order.setPaymentStatus("REFUND_PENDING");
            }
        }
        saveStatusHistory(order.getId(), OrderStatus.RETURN_REQUESTED, target, resolveUserId(),
                reason != null && !reason.isBlank() ? reason.trim()
                        : (approve ? "Chấp nhận yêu cầu trả hàng" : "Từ chối yêu cầu trả hàng"));
        return orders.save(order);
    }

    @Transactional
    public Order markRefunded(Long id, String reason) {
        Order order = getOrder(id);
        stateMachine.validateTransition(order.getStatus(), OrderStatus.REFUNDED);
        OrderStatus old = order.getStatus();
        order.setStatus(OrderStatus.REFUNDED);
        order.setPaymentStatus("REFUNDED");
        order.setUpdatedAt(LocalDateTime.now());
        soldCountService.syncForStatus(order, OrderStatus.REFUNDED);
        saveStatusHistory(order.getId(), old, OrderStatus.REFUNDED, resolveUserId(),
                reason != null && !reason.isBlank() ? reason.trim() : "Đã hoàn tiền cho khách");
        return orders.save(order);
    }

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
        if (!isManagerRole() && !SALES_CANCELLABLE_STATUSES.contains(order.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Đơn đã chuyển sang khâu kho/vận chuyển, nhân viên bán hàng không thể hủy. Vui lòng liên hệ quản lý cửa hàng.");
        }
        
        OrderStatus oldStatus = order.getStatus();
        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelReason(reason != null ? reason : "Khách hủy đơn");
        if ("PAID".equalsIgnoreCase(order.getPaymentStatus())) {
            order.setPaymentStatus("REFUND_PENDING");
        }
        order.setUpdatedAt(LocalDateTime.now());
        
        releaseReservations(order);
        orderStockService.restoreVariantStock(order);
        // A manager may cancel after packing; those goods had already left the shelf.
        orderStockService.restoreWarehouseOnHand(order, oldStatus);
        // Customer self-cancel gives the voucher use back; staff cancel must too,
        // or the customer permanently loses a per-user voucher slot.
        if (order.getVoucherCode() != null && !order.getVoucherCode().isBlank()) {
            marketingService.releaseVoucherUsage(order.getId(), order.getOrderCode());
        }
        saveStatusHistory(order.getId(), oldStatus, OrderStatus.CANCELLED, userId, reason);
        
        log.info("Order {} cancelled from {} by user {}", id, oldStatus, userId);
        return orders.save(order);
    }

    /** Tac gia ghi chu lay tu phien dang nhap; khong tin userId client gui len. */
    public OrderNote addNote(Long orderId, String content, String ignoredClientUserId) {
        if (content == null || content.isBlank()) throw new IllegalArgumentException("Nội dung ghi chú không được để trống");
        OrderNote note = new OrderNote();
        note.setOrder(getOrder(orderId));
        note.setContent(content.trim());
        String authorId = resolveUserId();
        note.setCreatedBy(authorId == null ? null
                : userRepository.findById(authorId).map(u -> u.getFullName() != null ? u.getFullName() : u.getEmail()).orElse(authorId));
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
        int orderedQty = order.getItems() == null ? 0 : order.getItems().stream()
                .filter(i -> i.getProduct() != null && i.getProduct().getId().equals(productId))
                .mapToInt(i -> i.getQuantity() != null ? i.getQuantity() : 0).sum();
        if (orderedQty == 0) throw new IllegalArgumentException("Sản phẩm này không thuộc đơn hàng");
        if (quantity > orderedQty) throw new IllegalArgumentException("Số lượng giữ vượt quá số lượng đặt (" + orderedQty + ")");
        
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
                .filter(o -> o.getStatus() == OrderStatus.PENDING_CONFIRMATION)
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
    @SuppressWarnings("unchecked")
    public Order createSalesOrder(java.util.Map<String, Object> payload) {
        String customerName = (String) payload.get("customerName");
        String customerEmail = (String) payload.get("customerEmail");
        String phone = (String) payload.get("phone");
        String shippingAddress = (String) payload.get("shippingAddress");
        String paymentMethod = (String) payload.get("paymentMethod");
        Object rawItems = payload.get("items");

        if (customerName == null || customerName.trim().isEmpty() || phone == null || phone.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên khách hàng và số điện thoại không được để trống");
        }
        if (!(rawItems instanceof List) || ((List<?>) rawItems).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn hàng phải có ít nhất 1 sản phẩm (variantId, quantity)");
        }

        Order order = new Order();
        String code = "ORD-" + System.currentTimeMillis() + "-" + (int)(Math.random() * 900 + 100);
        order.setOrderCode(code);
        order.setCustomerName(customerName.trim());
        order.setCustomerEmail(customerEmail != null && !customerEmail.isBlank() ? customerEmail.trim() : "pos-customer@et.tee");
        order.setCustomerPhone(phone.trim());
        order.setShippingAddressSnapshot(shippingAddress != null && !shippingAddress.isBlank() ? shippingAddress.trim() : "Tại quầy (POS)");
        String method = paymentMethod == null || paymentMethod.isBlank() ? "CASH" : paymentMethod.trim().toUpperCase();
        if (!POS_PAYMENT_METHODS.contains(method)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phương thức thanh toán không hợp lệ: " + paymentMethod);
        }
        order.setPaymentMethod(method);
        // COD: thu tien khi giao hang nen chua thanh toan; con lai da thu tai quay.
        order.setPaymentStatus("COD".equals(method) ? "COD_PENDING" : "PAID");
        order.setStatus(OrderStatus.CONFIRMED);
        order.setOrderStatus(OrderStatus.CONFIRMED.name());
        order.setShopId(resolveShopId() != null ? resolveShopId() : 1L);
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());

        List<OrderItem> items = new ArrayList<>();
        double total = 0.0;
        for (Object rawItem : (List<Object>) rawItems) {
            if (!(rawItem instanceof java.util.Map)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dữ liệu sản phẩm không hợp lệ");
            }
            java.util.Map<String, Object> itemMap = (java.util.Map<String, Object>) rawItem;
            Number variantIdNum = (Number) itemMap.get("variantId");
            Number quantityNum = (Number) itemMap.get("quantity");
            if (variantIdNum == null || quantityNum == null || quantityNum.intValue() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mỗi sản phẩm cần variantId và quantity > 0");
            }
            int quantity = quantityNum.intValue();

            ProductVariant variant = variantRepository.findByIdWithPessimisticLock(variantIdNum.longValue())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Không tìm thấy biến thể sản phẩm id=" + variantIdNum));

            if (variant.getAvailableQuantity() == null || variant.getAvailableQuantity() < quantity) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Sản phẩm '" + variant.getProduct().getName() + "' không đủ hàng. Còn lại: "
                                + (variant.getAvailableQuantity() != null ? variant.getAvailableQuantity() : 0));
            }

            variant.setStock(variant.getStock() - quantity);
            variant.setAvailableQuantity(variant.getAvailableQuantity() - quantity);
            variantRepository.save(variant);

            java.math.BigDecimal unitPriceBd = variant.getSalePrice() != null ? variant.getSalePrice() : variant.getPrice();
            double unitPrice = unitPriceBd != null ? com.nguyenhoanglong.util.PriceUtils.roundToThousand(unitPriceBd).doubleValue() : 0.0;

            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setProduct(variant.getProduct());
            item.setVariantId(variant.getId());
            item.setProductNameSnapshot(variant.getProduct().getName());
            item.setColorSnapshot(variant.getColor());
            item.setSizeSnapshot(variant.getSize());
            // Same meaning as an online order line: the price actually charged per unit, so
            // unitPrice x quantity = totalPrice on the receipt (it used to hold the list price).
            item.setUnitPrice(unitPrice);
            item.setSalePrice(variant.getSalePrice() != null ? variant.getSalePrice().doubleValue() : null);
            item.setQuantity(quantity);
            item.setTotalPrice(unitPrice * quantity);
            items.add(item);
            total += unitPrice * quantity;
        }
        order.setItems(items);
        order.setSubtotal(total);
        order.setDiscountTotal(0.0);
        order.setShippingFee(0.0);
        order.setTotalAmount(total);

        Order saved = orders.save(order);
        saveStatusHistory(saved.getId(), null, OrderStatus.CONFIRMED, resolveUserId(), "Tạo đơn hàng tại quầy (POS)");
        return saved;
    }

    private void validateInventoryForConfirmation(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            return;
        }
        
        for (OrderItem item : order.getItems()) {
            Long productId = item.getProduct().getId();
            Inventory inventory = (order.getShopId() != null
                    ? inventoryRepository.findByProductIdAndShopId(productId, order.getShopId())
                    : inventoryRepository.findByProductId(productId))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Không tìm thấy tồn kho của chi nhánh cho sản phẩm: " + item.getProduct().getName()));
            
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
            // Chỉ APPROVED mới đang giữ tồn; PENDING/REJECTED chưa giữ, RELEASED đã nhả hoặc đã xuất kho.
            if (reservation.getStatus() != ReservationStatus.APPROVED) continue;
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
