package com.ettee.opscore.order.service;

import com.ettee.opscore.common.exception.AppExceptions;
import com.ettee.opscore.identity.entity.AppUser;
import com.ettee.opscore.identity.repository.UserRepository;
import com.ettee.opscore.order.dto.CheckoutRequest;
import com.ettee.opscore.order.dto.CheckoutResponse;
import com.ettee.opscore.order.entity.*;
import com.ettee.opscore.order.repository.CustomerRepository;
import com.ettee.opscore.order.repository.OrderItemRepository;
import com.ettee.opscore.order.repository.OrderRepository;
import com.ettee.opscore.storeowner.product.entity.ProductVariant;
import com.ettee.opscore.storeowner.product.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CheckoutService {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductVariantRepository productVariantRepository;

    @Transactional
    public CheckoutResponse checkout(UUID userId, CheckoutRequest request) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Người dùng", userId));

        if (user.getStatus() != com.ettee.opscore.identity.entity.AccountStatus.active) {
            throw new AppExceptions.AuthenticationFailedException("Tài khoản không còn ở trạng thái hoạt động");
        }

        Customer customer = customerRepository.findByUserId(userId)
                .orElse(null);

        if (customer == null) {
            customer = new Customer();
            customer.setId(UUID.randomUUID());
            customer.setUserId(userId);
            customer.setFullName(user.getFullName());
            customer.setEmail(user.getEmail());
            customer.setPhone(user.getPhone());
            customer.setCreatedAt(Instant.now());
            customerRepository.save(customer);
        }

        if (request.items() == null || request.items().isEmpty()) {
            throw new AppExceptions.BusinessRuleViolationException("Giỏ hàng không được trống");
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal discountTotal = BigDecimal.ZERO;
        BigDecimal shippingFee = BigDecimal.valueOf(350000);
        BigDecimal shippingDiscount = BigDecimal.ZERO;

        for (var item : request.items()) {
            ProductVariant variant = productVariantRepository.findById(item.variantId())
                    .orElseThrow(
                            () -> new AppExceptions.ResourceNotFoundException("Biến thể sản phẩm", item.variantId()));

            if (!variant.isActive()) {
                throw new AppExceptions.BusinessRuleViolationException("Sản phẩm đã ngừng bán");
            }

            if (item.quantity() <= 0) {
                throw new AppExceptions.BusinessRuleViolationException("Số lượng phải lớn hơn 0");
            }

            BigDecimal lineTotal = variant.getPrice().multiply(BigDecimal.valueOf(item.quantity()));
            subtotal = subtotal.add(lineTotal);
        }

        if (subtotal.compareTo(BigDecimal.valueOf(20000000)) >= 0) {
            shippingFee = BigDecimal.ZERO;
        }

        Order order = new Order();
        order.setId(UUID.randomUUID());
        order.setOrderCode("ET" + System.currentTimeMillis());
        order.setCustomerId(customer.getId());
        order.setSourcePlatform("web");
        order.setCustomerName(request.customerName());
        order.setCustomerPhone(request.customerPhone());
        order.setCustomerEmail(request.customerEmail());
        order.setShippingAddress(Map.of(
                "province", request.shippingAddress().getOrDefault("province", ""),
                "district", request.shippingAddress().getOrDefault("district", ""),
                "ward", request.shippingAddress().getOrDefault("ward", ""),
                "streetAddress", request.shippingAddress().getOrDefault("streetAddress", "")));
        order.setStatus(OrderStatus.pending_confirmation);
        order.setPaymentMethod(request.paymentMethod());
        order.setPaymentStatus(PaymentStatus.unpaid);
        order.setCurrency("VND");
        order.setSubtotal(subtotal);
        order.setDiscountTotal(discountTotal);
        order.setShippingFee(shippingFee);
        order.setShippingDiscount(shippingDiscount);
        order.setVersion(0L);
        order.setPlacedAt(Instant.now());
        order.setUpdatedAt(Instant.now());
        order.setCheckoutKey(UUID.randomUUID());
        orderRepository.save(order);

        for (var item : request.items()) {
            ProductVariant variant = productVariantRepository.findById(item.variantId())
                    .orElseThrow(
                            () -> new AppExceptions.ResourceNotFoundException("Biến thể sản phẩm", item.variantId()));

            OrderItem orderItem = new OrderItem();
            orderItem.setId(UUID.randomUUID());
            orderItem.setOrderId(order.getId());
            orderItem.setVariantId(variant.getId());
            orderItem.setProductNameSnapshot(variant.getProduct().getName());
            orderItem.setSkuSnapshot(variant.getSku());
            orderItem.setVariantSnapshot(Map.of(
                    "size", variant.getAttributeSignature() != null ? variant.getAttributeSignature() : "",
                    "color", "",
                    "price", variant.getPrice()));
            orderItem.setUnitPrice(variant.getPrice());
            orderItem.setQuantity(item.quantity());
            orderItem.setDiscountAmount(BigDecimal.ZERO);
            orderItemRepository.save(orderItem);
        }

        return new CheckoutResponse(order.getId(), order.getOrderCode(), "Đặt hàng thành công");
    }
}
