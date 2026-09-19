package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class SalesOrderService {
    private final OrderRepository orders;
    private final OrderNoteRepository notes;
    private final StockReservationRepository reservations;

    public SalesOrderService(OrderRepository orders, OrderNoteRepository notes, StockReservationRepository reservations) {
        this.orders = orders; this.notes = notes; this.reservations = reservations;
    }

    private static final List<OrderStatus> PENDING_SALES_STATUSES =
            List.of(OrderStatus.pending_payment, OrderStatus.pending_confirmation);

    public List<Order> getAllOrders() { return orders.findAllByOrderByCreatedAtDesc(); }

    public List<Order> getNewOrders() {
        return orders.findByStatusInOrderByCreatedAtDesc(PENDING_SALES_STATUSES);
    }

    public Order getOrder(UUID id) { return orders.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng " + id)); }
    public List<OrderNote> getOrderNotes(UUID id) { getOrder(id); return notes.findByOrderIdOrderByCreatedAtDesc(id); }

    @Transactional
    public Order verifyOrder(UUID id, String name, String phone, String address) {
        Order order = getOrder(id);
        if (!PENDING_SALES_STATUSES.contains(order.getStatus())) throw new IllegalArgumentException("Chỉ xác minh được đơn đang chờ xác nhận");
        if (name != null && !name.isBlank()) order.setCustomerName(name.trim());
        order.setCustomerPhone(phone);
        order.setShippingAddress(address);
        order.setUpdatedAt(LocalDateTime.now());
        return orders.save(order);
    }

    @Transactional
    public Order confirmOrder(UUID id) {
        Order order = getOrder(id);
        if (order.getStatus() != OrderStatus.pending_confirmation) throw new IllegalArgumentException("Đơn phải ở trạng thái pending_confirmation trước khi xác nhận");
        order.setStatus(OrderStatus.confirmed);
        order.setUpdatedAt(LocalDateTime.now());
        return orders.save(order);
    }

    @Transactional
    public Order cancelOrder(UUID id, String reason) {
        Order order = getOrder(id);
        if (order.getStatus() == OrderStatus.delivered || order.getStatus() == OrderStatus.cancelled) throw new IllegalArgumentException("Đơn đã giao hoặc đã hủy không thể hủy");
        order.setStatus(OrderStatus.cancelled);
        order.setCancelReason(reason);
        order.setUpdatedAt(LocalDateTime.now());
        return orders.save(order);
    }

    public OrderNote addNote(UUID orderId, String content, UUID userId) {
        if (content == null || content.isBlank()) throw new IllegalArgumentException("Nội dung ghi chú không được để trống");
        OrderNote note = new OrderNote();
        note.setOrder(getOrder(orderId));
        note.setContent(content.trim());
        note.setCreatedBy(userId);
        return notes.save(note);
    }

    public StockReservation requestReservation(UUID orderId, UUID productId, Integer quantity) {
        Order order = getOrder(orderId);
        if (order.getStatus() != OrderStatus.confirmed) throw new IllegalArgumentException("Đơn phải ở trạng thái confirmed trước khi yêu cầu giữ hàng");
        if (quantity == null || quantity <= 0) throw new IllegalArgumentException("Số lượng giữ phải lớn hơn 0");
        StockReservation r = new StockReservation();
        r.setOrder(order);
        r.setProductId(productId);
        r.setQuantity(quantity);
        r.setStatus(ReservationStatus.pending);
        return reservations.save(r);
    }
}
