package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.CheckoutRequest;
import com.nguyenhoanglong.dto.OrderResponse;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderStatusHistoryRepository historyRepository;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private ProductVariantRepository variantRepository;

    @Autowired
    private MailService mailService;

    @Autowired
    private MarketingService marketingService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SalesNotificationService salesNotificationService;

    @Value("${app.payment.bank.name}")
    private String bankName;

    @Value("${app.payment.bank.account-number}")
    private String bankAccountNumber;

    @Value("${app.payment.bank.account-name}")
    private String bankAccountName;

    /** Bank-transfer orders not paid within this window are cancelled and their stock released. */
    @Value("${app.order.unpaid-expiry-hours:24}")
    private long unpaidExpiryHours;

    /** Matches the published return policy (/policy/return). */
    static final int RETURN_WINDOW_DAYS = 30;

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private static String firstNonBlank(String preferred, String fallback) {
        return preferred != null && !preferred.trim().isEmpty() ? preferred.trim() : fallback;
    }

    @Transactional
    public OrderResponse checkout(User user, String guestToken, CheckoutRequest request) {
        Cart cart;
        if (user != null) {
            cart = cartRepository.findByUserId(user.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giỏ hàng không tồn tại"));
        } else if (guestToken != null && !guestToken.trim().isEmpty()) {
            cart = cartRepository.findByGuestToken(guestToken)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giỏ hàng không tồn tại"));
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Yêu cầu thông tin giỏ hàng");
        }

        if (cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giỏ hàng đang trống");
        }

        Order order = new Order();
        // Generate an unguessable 10-character code using UUID
        String orderCode = "DH" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        order.setOrderCode(orderCode);
        
        // Assign shopId: use user's shop if available, otherwise default to shop 1 (single-shop mode)
        if (user != null && user.getShopId() != null) {
            order.setShopId(user.getShopId());
        } else {
            order.setShopId(1L); // Default shop for customer/guest orders
        }
        
        if (user != null) {
            order.setUser(user);
            // The checkout form is prefilled from the profile, so what it sends is what the
            // customer confirmed. The profile is only a fallback: overriding the form used to
            // ship gift orders to the account holder instead of the typed recipient.
            order.setCustomerName(firstNonBlank(request.getCustomerName(), user.getFullName()));
            order.setCustomerPhone(firstNonBlank(request.getCustomerPhone(), user.getPhone()));
            order.setCustomerEmail(firstNonBlank(request.getCustomerEmail(), user.getEmail()));
        } else {
            order.setGuestToken(guestToken);
            order.setCustomerName(request.getCustomerName());
            order.setCustomerPhone(request.getCustomerPhone());
            order.setCustomerEmail(request.getCustomerEmail());
        }
        
        if (order.getCustomerName() == null || order.getCustomerName().trim().isEmpty() ||
            order.getCustomerPhone() == null || order.getCustomerPhone().trim().isEmpty() ||
            order.getCustomerEmail() == null || order.getCustomerEmail().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng điền đầy đủ thông tin liên hệ");
        }

        order.setShippingAddressSnapshot(request.getShippingAddress());
        order.setNote(request.getNote());
        
        order.setPaymentMethod(request.getPaymentMethod());
        
        if ("COD".equals(request.getPaymentMethod())) {
            order.setOrderStatus("PENDING_CONFIRMATION");
            order.setStatus(OrderStatus.PENDING_CONFIRMATION);
            order.setPaymentStatus("COD_PENDING");
        } else if ("BANK_TRANSFER".equals(request.getPaymentMethod())) {
            order.setOrderStatus("PENDING_PAYMENT");
            order.setStatus(OrderStatus.PENDING_PAYMENT);
            order.setPaymentStatus("WAITING_TRANSFER");
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phương thức thanh toán không hợp lệ");
        }

        Double subtotal = 0.0;
        List<OrderItem> orderItems = new ArrayList<>();

        for (CartItem cartItem : cart.getItems()) {
            // Lock the variant row to prevent concurrent oversell
            ProductVariant variant = variantRepository.findByIdWithPessimisticLock(cartItem.getProductVariant().getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sản phẩm không tồn tại"));

            // The cart only checks status when an item is added; a product retired
            // afterwards must not stay purchasable from an old cart.
            if (variant.getProduct() == null || !"ACTIVE".equals(variant.getProduct().getStatus())) {
                String name = variant.getProduct() != null ? variant.getProduct().getName() : "Sản phẩm";
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "'" + name + "' đã ngừng kinh doanh. Vui lòng xóa khỏi giỏ hàng để tiếp tục.");
            }

            // Validate inventory
            if (variant.getAvailableQuantity() < cartItem.getQuantity()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sản phẩm '" + variant.getProduct().getName() + "' - Size " + variant.getSize() + " không đủ số lượng tồn kho.");
            }
            
            // Deduct inventory
            variant.setAvailableQuantity(variant.getAvailableQuantity() - cartItem.getQuantity());
            variant.setStock(variant.getStock() - cartItem.getQuantity());
            variantRepository.save(variant);

            // sold_count khong con tang o day: no chi thay doi khi don thuc su
            // giao thanh cong (xem SoldCountService, goi tu OrderTransitionService /
            // ShippingService.delivered()). Truoc day tang o checkout khien don
            // chua bao gio giao van duoc tinh la "da ban".

            // Create snapshot
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setProduct(variant.getProduct());
            orderItem.setVariantId(variant.getId());
            orderItem.setProductNameSnapshot(variant.getProduct().getName());
            
            String img = null;
            if (variant.getProduct().getImages() != null && !variant.getProduct().getImages().isEmpty()) {
                img = variant.getProduct().getImages().get(0).getImageUrl();
            }
            orderItem.setImageSnapshot(img);
            orderItem.setColorSnapshot(variant.getColor());
            orderItem.setSizeSnapshot(variant.getSize());
            
            Double price = com.nguyenhoanglong.util.PriceUtils.roundToThousand(
                    variant.getSalePrice() != null ? variant.getSalePrice() : variant.getPrice()).doubleValue();
            orderItem.setUnitPrice(price);
            orderItem.setQuantity(cartItem.getQuantity());
            
            Double totalItemPrice = price * cartItem.getQuantity();
            orderItem.setTotalPrice(totalItemPrice);
            
            subtotal += totalItemPrice;
            orderItems.add(orderItem);
        }

        order.setItems(orderItems);
        order.setSubtotal(subtotal);
        order.setShippingFee(0.0); // Hardcode freeship or logic later
        order.setDiscountTotal(0.0);

        // ── Voucher application (server-side authoritative) ──
        Voucher appliedVoucher = null;
        if (request.getVoucherCode() != null && !request.getVoucherCode().trim().isEmpty()) {
            String userId = user != null ? user.getId() : null;
            // isNewCustomer: a user with prior orders is not new
            boolean hasPriorOrders = user != null && orderRepository.existsByUserId(user.getId());
            boolean isNewCustomer = user != null && !hasPriorOrders;
            Voucher voucher = marketingService.validateVoucher(
                    request.getVoucherCode(),
                    BigDecimal.valueOf(subtotal),
                    userId,
                    isNewCustomer
            );
            if (user == null) {
                marketingService.assertGuestVoucherLimit(voucher, order.getCustomerEmail(), order.getCustomerPhone());
            }
            java.util.Map<String, Object> discount = marketingService.computeDiscount(
                    voucher, BigDecimal.valueOf(subtotal));
            BigDecimal discountAmount = (BigDecimal) discount.get("discountAmount");
            boolean freeShip = Boolean.TRUE.equals(discount.get("freeShipping"));
            double discountD = discountAmount.doubleValue();
            order.setDiscountTotal(discountD);
            order.setVoucherCode(voucher.getCode());
            order.setVoucherId(voucher.getId());
            if (freeShip) order.setShippingFee(0.0); // already 0 but explicit
            appliedVoucher = voucher;
        }

        double finalTotal = subtotal + order.getShippingFee() - order.getDiscountTotal();
        if (finalTotal < 0) finalTotal = 0.0;
        order.setTotalAmount(finalTotal);

        Order savedOrder = orderRepository.save(order);
        if (savedOrder.getStatus() == OrderStatus.PENDING_CONFIRMATION) {
            salesNotificationService.notifyNewOrderAwaitingConfirmation(savedOrder);
        }

        // Increment voucher usage only after order is persisted successfully
        if (appliedVoucher != null) {
            marketingService.incrementVoucherUsage(
                    appliedVoucher,
                    user != null ? user.getId() : null,
                    savedOrder.getOrderCode(),
                    BigDecimal.valueOf(subtotal),
                    BigDecimal.valueOf(order.getDiscountTotal())
            );
            // Track conversion for analytics
            try {
                marketingService.trackEvent(
                        null,
                        "CONVERSION",
                        null,
                        appliedVoucher.getId(),
                        null,
                        null,
                        user != null ? user.getId() : null,
                        savedOrder.getId(),
                        BigDecimal.valueOf(finalTotal)
                );
            } catch (Exception ignore) {}
        }

        // Record initial order status history
        try {
            OrderStatusHistory history = new OrderStatusHistory();
            history.setOrderId(savedOrder.getId());
            history.setFromStatus(null);
            history.setStatus(savedOrder.getStatus().name());
            history.setChangedBy(user != null ? user.getId() : "GUEST:" + guestToken);
            history.setReason("Tạo đơn hàng mới");
            historyRepository.save(history);
        } catch (Exception e) {
            // Log but don't fail the order creation
            org.slf4j.LoggerFactory.getLogger(OrderService.class).warn("Failed to record order status history", e);
        }

        // Clear cart
        cart.getItems().clear();
        cartRepository.save(cart);

        // Send Email
        String bankDetailsHtml = null;
        if ("BANK_TRANSFER".equals(request.getPaymentMethod())) {
            // Same app.payment.bank.* config the checkout page shows (PaymentConfigController).
            bankDetailsHtml = "<p>Ngân hàng: <strong>" + bankName + "</strong></p>" +
                              "<p>Số tài khoản: <strong>" + bankAccountNumber + "</strong></p>" +
                              "<p>Chủ tài khoản: <strong>" + bankAccountName + "</strong></p>" +
                              "<p>Nội dung chuyển khoản: <strong>ETTEE " + orderCode + " " + savedOrder.getCustomerPhone() + "</strong></p>" +
                              "<p>Vui lòng chuyển khoản trong vòng " + unpaidExpiryHours + " giờ, quá hạn đơn hàng sẽ tự động hủy.</p>";
        }
        String customerEmail = user != null ? user.getEmail() : request.getCustomerEmail();
        mailService.sendOrderConfirmation(customerEmail, orderCode, savedOrder.getTotalAmount(), request.getPaymentMethod(), bankDetailsHtml);

        return mapToResponse(savedOrder);
    }

    public List<OrderResponse> getMyOrders(User user) {
        List<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        return orders.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public OrderResponse getOrderDetails(String orderCode, User user, String guestToken) {
        Order order = getOwnedOrder(orderCode, user, guestToken);

        OrderResponse res = mapToResponse(order);
        if (order.getStatus() == OrderStatus.DELIVERED) {
            LocalDateTime deadline = returnDeadline(order);
            res.setReturnDeadline(deadline != null ? deadline.toString() : null);
            res.setReturnEligible(deadline == null || !LocalDateTime.now().isAfter(deadline));
        }
        return res;
    }

    public OrderResponse toResponse(Order order) {
        return mapToResponse(order);
    }

    /** The order, if it belongs to this user (or to this guest token for a guest order). */
    public Order getOwnedOrder(String orderCode, User user, String guestToken) {
        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng"));
        
        if (order.getUser() != null) {
            if (user == null || !order.getUser().getId().equals(user.getId())) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Bạn không có quyền xem đơn hàng này");
            }
        } else {
            // Guest order
            if (guestToken == null || guestToken.trim().isEmpty() || !guestToken.equals(order.getGuestToken())) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Bạn không có quyền xem đơn hàng này");
            }
        }
        return order;
    }

    /**
     * Lets the customer settle an order that is still waiting for payment: correct the
     * receiver details and pick the payment method (bank transfer / QR, or COD on delivery).
     * Choosing COD moves the order on to PENDING_CONFIRMATION like a normal COD checkout.
     */
    @Transactional
    public OrderResponse updatePayment(String orderCode, User user, String guestToken, String paymentMethod,
                                       String customerName, String customerPhone, String shippingAddress) {
        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng"));

        if (order.getUser() != null) {
            if (user == null || !order.getUser().getId().equals(user.getId())) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.FORBIDDEN, "Bạn không có quyền thao tác trên đơn hàng này");
            }
        } else if (guestToken == null || guestToken.trim().isEmpty() || !guestToken.equals(order.getGuestToken())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Bạn không có quyền thao tác trên đơn hàng này");
        }

        OrderStatus currentStatus = order.getStatus() != null ? order.getStatus() :
                (order.getOrderStatus() != null ? OrderStatus.valueOf(order.getOrderStatus()) : OrderStatus.PENDING_CONFIRMATION);
        if (currentStatus != OrderStatus.PENDING_PAYMENT || "PAID".equals(order.getPaymentStatus())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Đơn hàng này không còn ở trạng thái chờ thanh toán");
        }
        if (!"COD".equals(paymentMethod) && !"BANK_TRANSFER".equals(paymentMethod)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Phương thức thanh toán không hợp lệ");
        }

        if (customerName != null && !customerName.trim().isEmpty()) order.setCustomerName(customerName.trim());
        if (customerPhone != null && !customerPhone.trim().isEmpty()) order.setCustomerPhone(customerPhone.trim());
        if (shippingAddress != null && !shippingAddress.trim().isEmpty()) order.setShippingAddressSnapshot(shippingAddress.trim());
        order.setPaymentMethod(paymentMethod);

        if ("COD".equals(paymentMethod)) {
            order.setOrderStatus("PENDING_CONFIRMATION");
            order.setStatus(OrderStatus.PENDING_CONFIRMATION);
            order.setPaymentStatus("COD_PENDING");
        } else {
            order.setPaymentStatus("WAITING_TRANSFER");
        }
        Order saved = orderRepository.save(order);

        if ("COD".equals(paymentMethod)) {
            salesNotificationService.notifyNewOrderAwaitingConfirmation(saved);
            try {
                OrderStatusHistory history = new OrderStatusHistory();
                history.setOrderId(saved.getId());
                history.setFromStatus(currentStatus.name());
                history.setStatus(OrderStatus.PENDING_CONFIRMATION.name());
                history.setChangedBy(user != null ? user.getEmail() : "GUEST:" + (guestToken != null ? guestToken : ""));
                history.setReason("Khách hàng đổi sang thanh toán khi nhận hàng (COD)");
                historyRepository.save(history);
            } catch (Exception e) {
                org.slf4j.LoggerFactory.getLogger(OrderService.class).warn("Failed to record payment method change history", e);
            }
        }
        return mapToResponse(saved);
    }

    @Transactional
    public OrderResponse cancelOrder(String orderCode, User user, String guestToken, String reason) {
        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng"));

        if (order.getUser() != null) {
            if (user == null || !order.getUser().getId().equals(user.getId())) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.FORBIDDEN, "Bạn không có quyền thao tác trên đơn hàng này");
            }
        } else {
            // Guest order
            if (guestToken == null || guestToken.trim().isEmpty() || !guestToken.equals(order.getGuestToken())) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.FORBIDDEN, "Bạn không có quyền thao tác trên đơn hàng này");
            }
        }

        OrderStatus currentStatus = order.getStatus() != null ? order.getStatus() :
                (order.getOrderStatus() != null ? OrderStatus.valueOf(order.getOrderStatus()) : OrderStatus.PENDING_CONFIRMATION);

        // Khách chỉ được tự hủy khi đơn còn nằm trong nội bộ (chưa đóng gói xong
        // và giao cho hãng vận chuyển). Trước đây chỉ chặn DELIVERED/SHIPPING/
        // RETURNED, nên khách vẫn hủy được đơn đã PACKED hoặc đã HANDED_TO_CARRIER
        // - hàng đã rời kho hoặc đã giao cho shipper, không thể thu hồi qua một
        // API tự phục vụ.
        java.util.Set<OrderStatus> CUSTOMER_CANCELLABLE = java.util.EnumSet.of(
                OrderStatus.DRAFT, OrderStatus.PENDING_PAYMENT, OrderStatus.PENDING_CONFIRMATION,
                OrderStatus.CONFIRMED, OrderStatus.PICKING);
        if (!CUSTOMER_CANCELLABLE.contains(currentStatus)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Đơn hàng đã được xử lý (đóng gói/giao vận chuyển/đã giao/đã hủy) nên không thể tự hủy. Vui lòng liên hệ CSKH.");
        }

        String cancelReason = reason != null && !reason.trim().isEmpty() ? reason.trim() : "Khách hàng yêu cầu hủy đơn hàng";
        Order savedOrder = cancelAndRelease(order, cancelReason);
        recordHistory(savedOrder, currentStatus, OrderStatus.CANCELLED,
                user != null ? user.getEmail() : "GUEST:" + (guestToken != null ? guestToken : ""), cancelReason);

        return mapToResponse(savedOrder);
    }

    /**
     * Cancels the order and undoes everything checkout took: variant stock and the
     * voucher use. A paid order is flagged REFUND_PENDING so the money is not forgotten.
     */
    private Order cancelAndRelease(Order order, String reason) {
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                restoreVariantStock(item);
            }
        }

        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelReason(reason);
        if ("PAID".equalsIgnoreCase(order.getPaymentStatus())) {
            order.setPaymentStatus("REFUND_PENDING");
        }
        order.setUpdatedAt(LocalDateTime.now());
        Order saved = orderRepository.save(order);

        if (order.getVoucherCode() != null && !order.getVoucherCode().isBlank()) {
            try {
                marketingService.releaseVoucherUsage(order.getId(), order.getOrderCode());
            } catch (Exception e) {
                log.warn("Failed to release voucher usage on cancel for order {}", order.getOrderCode(), e);
            }
        }
        return saved;
    }

    private void restoreVariantStock(OrderItem item) {
        Long variantId = item.getVariantId();
        int quantity = item.getQuantity() != null ? item.getQuantity() : 0;
        if (variantId == null || variantId <= 0L || quantity <= 0) {
            return;
        }
        variantRepository.findByIdWithPessimisticLock(variantId).ifPresent(variant -> {
            variant.setStock(variant.getStock() + quantity);
            variant.setAvailableQuantity(variant.getAvailableQuantity() + quantity);
            variantRepository.save(variant);
        });
    }

    private void recordHistory(Order order, OrderStatus from, OrderStatus to, String changedBy, String reason) {
        try {
            OrderStatusHistory history = new OrderStatusHistory();
            history.setOrderId(order.getId());
            history.setFromStatus(from != null ? from.name() : null);
            history.setStatus(to.name());
            history.setChangedBy(changedBy);
            history.setReason(reason);
            historyRepository.save(history);
        } catch (Exception e) {
            log.warn("Failed to record order status history {} -> {} for order {}", from, to, order.getOrderCode(), e);
        }
    }

    /**
     * Checkout deducts stock immediately, so a bank-transfer order the customer never
     * pays would hold that stock forever. Cancel such orders once the payment window
     * has passed.
     */
    @Scheduled(fixedDelayString = "${app.order.unpaid-expiry-check-ms:900000}", initialDelay = 60000)
    @Transactional
    public void expireUnpaidOrders() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(unpaidExpiryHours);
        List<Order> stale = orderRepository.findByStatusAndCreatedAtBefore(OrderStatus.PENDING_PAYMENT, cutoff);
        for (Order order : stale) {
            if ("PAID".equalsIgnoreCase(order.getPaymentStatus())) {
                continue; // payment recorded but not yet confirmed by staff; leave it to them
            }
            String reason = "Tự động hủy: quá " + unpaidExpiryHours + " giờ chưa nhận được thanh toán";
            Order saved = cancelAndRelease(order, reason);
            recordHistory(saved, OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED, "SYSTEM", reason);
        }
        if (!stale.isEmpty()) {
            log.info("Expired {} unpaid order(s) older than {}h", stale.size(), unpaidExpiryHours);
        }
    }

    /** When the order was delivered, from its status history (the order row keeps no timestamp). */
    private LocalDateTime deliveredAt(Order order) {
        return historyRepository.findByOrderIdOrderByCreatedAtAsc(order.getId()).stream()
                .filter(h -> OrderStatus.DELIVERED.name().equals(h.getStatus()))
                .map(OrderStatusHistory::getCreatedAt)
                .filter(java.util.Objects::nonNull)
                .reduce((first, second) -> second)
                .orElse(order.getUpdatedAt());
    }

    private LocalDateTime returnDeadline(Order order) {
        LocalDateTime delivered = deliveredAt(order);
        return delivered != null ? delivered.plusDays(RETURN_WINDOW_DAYS) : null;
    }

    /** Customer asks to return a delivered order; staff approve or reject it in the sales dashboard. */
    @Transactional
    public OrderResponse requestReturn(String orderCode, User user, String guestToken, String reason) {
        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng"));
        if (order.getUser() != null) {
            if (user == null || !order.getUser().getId().equals(user.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền thao tác trên đơn hàng này");
            }
        } else if (guestToken == null || guestToken.trim().isEmpty() || !guestToken.equals(order.getGuestToken())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền thao tác trên đơn hàng này");
        }
        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ có thể yêu cầu trả hàng với đơn đã giao thành công");
        }
        LocalDateTime deadline = returnDeadline(order);
        if (deadline != null && LocalDateTime.now().isAfter(deadline)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Đơn hàng đã quá " + RETURN_WINDOW_DAYS + " ngày kể từ khi nhận hàng nên không thể trả. Vui lòng liên hệ CSKH.");
        }
        if (reason == null || reason.trim().length() < 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng cho biết lý do trả hàng (tối thiểu 5 ký tự)");
        }

        order.setStatus(OrderStatus.RETURN_REQUESTED);
        order.setUpdatedAt(LocalDateTime.now());
        Order saved = orderRepository.save(order);
        recordHistory(saved, OrderStatus.DELIVERED, OrderStatus.RETURN_REQUESTED,
                user != null ? user.getEmail() : "GUEST:" + guestToken, reason.trim());
        return mapToResponse(saved);
    }

    private OrderResponse mapToResponse(Order order) {
        OrderResponse res = new OrderResponse();
        res.setId(order.getId());
        res.setCreatedAt(order.getCreatedAt() != null ? order.getCreatedAt().toString() : null);
        res.setOrderCode(order.getOrderCode());
        res.setCustomerName(order.getCustomerName());
        res.setCustomerPhone(order.getCustomerPhone());
        res.setShippingAddressSnapshot(order.getShippingAddressSnapshot());
        res.setSubtotal(order.getSubtotal());
        res.setDiscountTotal(order.getDiscountTotal());
        res.setVoucherCode(order.getVoucherCode());
        res.setTotalAmount(order.getTotalAmount());
        res.setPaymentMethod(order.getPaymentMethod());
        res.setPaymentStatus(order.getPaymentStatus());
        res.setOrderStatus(order.getOrderStatus());
        
        if (order.getItems() != null) {
            List<OrderResponse.OrderItemResponse> itemResponses = order.getItems().stream().map(item -> {
                OrderResponse.OrderItemResponse r = new OrderResponse.OrderItemResponse();
                r.setId(item.getId());
                r.setProductSlug(item.getProduct() != null ? item.getProduct().getSlug() : null);
                r.setReviewed(item.isReviewed());
                r.setProductName(item.getProductNameSnapshot());
                r.setImage(item.getImageSnapshot());
                r.setColor(item.getColorSnapshot());
                r.setSize(item.getSizeSnapshot());
                r.setUnitPrice(item.getUnitPrice());
                r.setQuantity(item.getQuantity());
                r.setTotalPrice(item.getTotalPrice());
                return r;
            }).collect(Collectors.toList());
            res.setItems(itemResponses);
        }
        
        return res;
    }
}
