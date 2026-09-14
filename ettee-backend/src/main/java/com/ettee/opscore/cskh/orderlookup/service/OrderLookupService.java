package com.ettee.opscore.cskh.orderlookup.service;

import com.ettee.opscore.cskh.orderlookup.dto.OrderDetailDto;
import com.ettee.opscore.cskh.orderlookup.dto.OrderItemDto;
import com.ettee.opscore.cskh.orderlookup.dto.OrderSummaryDto;
import com.ettee.opscore.common.dto.PageResponse;
import com.ettee.opscore.common.exception.AppExceptions;
import com.ettee.opscore.order.entity.Order;
import com.ettee.opscore.order.entity.OrderItem;
import com.ettee.opscore.order.entity.OrderStatus;
import com.ettee.opscore.order.repository.OrderItemRepository;
import com.ettee.opscore.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Nghiệp vụ "Tra cứu đơn ở mức cần thiết" — CSKH xem đủ để hỗ trợ, không có
 * quyền sửa giá/kho.
 */
@Service
@RequiredArgsConstructor
public class OrderLookupService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;

    @Transactional(readOnly = true)
    public PageResponse<OrderSummaryDto> search(String keyword, OrderStatus status, Pageable pageable) {
        return PageResponse.from(
                orderRepository.search(keyword, status == null ? null : status.name(), pageable).map(this::toSummary));
    }

    @Transactional(readOnly = true)
    public OrderDetailDto getByCode(String orderCode) {
        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Đơn hàng", orderCode));
        return toDetail(order);
    }

    @Transactional(readOnly = true)
    public List<OrderSummaryDto> getByCustomerId(UUID customerId) {
        return orderRepository.findAllByCustomerIdOrderByPlacedAtDesc(customerId)
                .stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderDetailDto getById(UUID id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Đơn hàng", id));
        return toDetail(order);
    }

    private OrderDetailDto toDetail(Order o) {
        List<OrderItemDto> items = orderItemRepository.findAllByOrderId(o.getId()).stream()
                .map(this::toItemDto).toList();
        return new OrderDetailDto(o.getId(), o.getOrderCode(), o.getCustomerId(), o.getCustomerName(),
                o.getCustomerPhone(), o.getCustomerEmail(), o.getShippingAddress(), o.getStatus(),
                o.getPaymentMethod(), o.getPaymentStatus(), o.getSubtotal(), o.getDiscountTotal(),
                o.getShippingFee(), o.getShippingDiscount(), o.getTotal(), o.getPlacedAt(), o.getConfirmedAt(),
                o.getCancelledAt(), o.getCancelledReason(), items);
    }

    private OrderItemDto toItemDto(OrderItem i) {
        return new OrderItemDto(i.getId(), i.getVariantId(), i.getProductNameSnapshot(), i.getSkuSnapshot(),
                i.getUnitPrice(), i.getQuantity(), i.getDiscountAmount(), i.getLineTotal());
    }

    private OrderSummaryDto toSummary(Order o) {
        return new OrderSummaryDto(o.getId(), o.getOrderCode(), o.getCustomerName(), o.getCustomerPhone(),
                o.getStatus(), o.getPaymentStatus(), o.getTotal(), o.getPlacedAt());
    }
}
