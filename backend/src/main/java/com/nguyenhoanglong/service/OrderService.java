package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.CheckoutRequest;
import com.nguyenhoanglong.dto.OrderResponse;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
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

    @Transactional
    public OrderResponse checkout(User user, String guestToken, CheckoutRequest request) {
        Cart cart;
        if (user != null) {
            cart = cartRepository.findByUserId(user.getId())
                    .orElseThrow(() -> new RuntimeException("Giỏ hàng không tồn tại"));
        } else if (guestToken != null && !guestToken.trim().isEmpty()) {
            cart = cartRepository.findByGuestToken(guestToken)
                    .orElseThrow(() -> new RuntimeException("Giỏ hàng không tồn tại"));
        } else {
            throw new RuntimeException("Yêu cầu thông tin giỏ hàng");
        }

        if (cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new RuntimeException("Giỏ hàng đang trống");
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
            order.setCustomerName(user.getFullName() != null && !user.getFullName().isEmpty() ? user.getFullName() : request.getCustomerName());
            order.setCustomerPhone(user.getPhone() != null && !user.getPhone().isEmpty() ? user.getPhone() : request.getCustomerPhone());
            order.setCustomerEmail(user.getEmail() != null && !user.getEmail().isEmpty() ? user.getEmail() : request.getCustomerEmail());
        } else {
            order.setGuestToken(guestToken);
            order.setCustomerName(request.getCustomerName());
            order.setCustomerPhone(request.getCustomerPhone());
            order.setCustomerEmail(request.getCustomerEmail());
        }
        
        if (order.getCustomerName() == null || order.getCustomerName().trim().isEmpty() ||
            order.getCustomerPhone() == null || order.getCustomerPhone().trim().isEmpty() ||
            order.getCustomerEmail() == null || order.getCustomerEmail().trim().isEmpty()) {
            throw new RuntimeException("Vui lòng điền đầy đủ thông tin liên hệ");
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
            throw new RuntimeException("Phương thức thanh toán không hợp lệ");
        }

        Double subtotal = 0.0;
        List<OrderItem> orderItems = new ArrayList<>();

        for (CartItem cartItem : cart.getItems()) {
            // Lock the variant row to prevent concurrent oversell
            ProductVariant variant = variantRepository.findByIdWithPessimisticLock(cartItem.getProductVariant().getId())
                    .orElseThrow(() -> new RuntimeException("Sản phẩm không tồn tại"));
            
            // Validate inventory
            if (variant.getAvailableQuantity() < cartItem.getQuantity()) {
                throw new RuntimeException("Sản phẩm '" + variant.getProduct().getName() + "' - Size " + variant.getSize() + " không đủ số lượng tồn kho.");
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
            
            Double price = variant.getSalePrice() != null ? variant.getSalePrice().doubleValue() : variant.getPrice().doubleValue();
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
            bankDetailsHtml = "<p>Ngân hàng: <strong>MBBank</strong></p>" +
                              "<p>Số tài khoản: <strong>0968623156</strong></p>" +
                              "<p>Chủ tài khoản: <strong>Nguyen Hoang Long</strong></p>" +
                              "<p>Nội dung chuyển khoản: <strong>ETTEE " + orderCode + " " + savedOrder.getCustomerPhone() + "</strong></p>";
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
        
        return mapToResponse(order);
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

        if (currentStatus == OrderStatus.CANCELLED) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Đơn hàng đã được hủy trước đó");
        }
        if (currentStatus == OrderStatus.DELIVERED || currentStatus == OrderStatus.SHIPPING || currentStatus == OrderStatus.RETURNED) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Không thể hủy đơn hàng đang giao hoặc đã hoàn tất");
        }

        // Restore variant stock deducted at checkout
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                Long variantId = item.getVariantId();
                if (variantId != null && variantId > 0L) {
                    int quantity = item.getQuantity() != null ? item.getQuantity() : 0;
                    if (quantity > 0) {
                        variantRepository.findByIdWithPessimisticLock(variantId).ifPresent(variant -> {
                            variant.setStock(variant.getStock() + quantity);
                            variant.setAvailableQuantity(variant.getAvailableQuantity() + quantity);
                            variantRepository.save(variant);
                        });
                    }
                }
            }
        }

        order.setStatus(OrderStatus.CANCELLED);
        order.setOrderStatus("CANCELLED");
        Order savedOrder = orderRepository.save(order);

        // Record history
        try {
            OrderStatusHistory history = new OrderStatusHistory();
            history.setOrderId(savedOrder.getId());
            history.setFromStatus(currentStatus.name());
            history.setStatus(OrderStatus.CANCELLED.name());
            history.setChangedBy(user != null ? user.getEmail() : "GUEST:" + (guestToken != null ? guestToken : ""));
            history.setReason(reason != null && !reason.trim().isEmpty() ? reason.trim() : "Khách hàng yêu cầu hủy đơn hàng");
            historyRepository.save(history);
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(OrderService.class).warn("Failed to record cancel order history", e);
        }

        return mapToResponse(savedOrder);
    }

    private OrderResponse mapToResponse(Order order) {
        OrderResponse res = new OrderResponse();
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
