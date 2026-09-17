package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class SalesOrderService {
    private final OrderRepository orders;
    private final OrderNoteRepository notes;
    private final StockReservationRepository reservations;

    public SalesOrderService(OrderRepository orders, OrderNoteRepository notes, StockReservationRepository reservations) {
        this.orders = orders;
        this.notes = notes;
        this.reservations = reservations;
    }

    // Đơn chờ nhân viên bán hàng xử lý: khách vừa gửi nhưng chưa xác nhận.
    private static final List<OrderStatus> PENDING_SALES_STATUSES =
            List.of(OrderStatus.PENDING_PAYMENT, OrderStatus.PENDING_CONFIRMATION);

    public List<Order> getAllOrders() { return orders.findAllByOrderByCreatedAtDesc(); }

    public List<Order> getNewOrders() {
        return orders.findByStatusInOrderByCreatedAtDesc(PENDING_SALES_STATUSES);
    }

    public Order getOrder(Long id) { return orders.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng " + id)); }
    public List<OrderNote> getOrderNotes(Long id) { getOrder(id); return notes.findByOrderIdOrderByCreatedAtDesc(id); }

    @Transactional
    public Order verifyOrder(Long id, String name, String phone, String address) {
        Order order = getOrder(id);
        if (!PENDING_SALES_STATUSES.contains(order.getStatus())) throw new IllegalArgumentException("Chỉ xác minh được đơn đang chờ xác nhận");
        if (name != null && !name.isBlank()) order.setCustomerName(name.trim());
        order.setPhone(phone);
        order.setShippingAddress(address);
        order.setUpdatedAt(LocalDateTime.now());
        return orders.save(order);
    }

    @Transactional
    public Order confirmOrder(Long id) {
        Order order = getOrder(id);
        // order_status_transitions: pending_confirmation -> confirmed (order.confirm)
        if (order.getStatus() != OrderStatus.PENDING_CONFIRMATION) throw new IllegalArgumentException("Đơn phải ở trạng thái PENDING_CONFIRMATION trước khi xác nhận");
        order.setStatus(OrderStatus.CONFIRMED);
        order.setUpdatedAt(LocalDateTime.now());
        return orders.save(order);
    }

    @Transactional
    public Order cancelOrder(Long id, String reason) {
        Order order = getOrder(id);
        // order_status_transitions: pending_payment|cancel, pending_confirmation|cancel, confirmed|cancel
        if (order.getStatus() == OrderStatus.DELIVERED || order.getStatus() == OrderStatus.CANCELLED) throw new IllegalArgumentException("Đơn đã giao hoặc đã hủy không thể hủy");
        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelReason(reason);
        order.setUpdatedAt(LocalDateTime.now());
        return orders.save(order);
    }

    public OrderNote addNote(Long orderId, String content, Long userId) {
        if (content == null || content.isBlank()) throw new IllegalArgumentException("Nội dung ghi chú không được để trống");
        OrderNote note = new OrderNote();
        note.setOrder(getOrder(orderId));
        note.setContent(content.trim());
        note.setCreatedBy(userId);
        return notes.save(note);
    }

    public StockReservation requestReservation(Long orderId, Long productId, Integer quantity) {
        Order order = getOrder(orderId);
        if (order.getStatus() != OrderStatus.CONFIRMED) throw new IllegalArgumentException("Đơn phải ở trạng thái CONFIRMED trước khi yêu cầu giữ hàng");
        // stock_holds chỉ cho phép tạo khi đơn chưa bàn giao hẳn cho vận chuyển.
        if (quantity == null || quantity <= 0) throw new IllegalArgumentException("Số lượng giữ phải lớn hơn 0");
        StockReservation r = new StockReservation();
        r.setOrder(order);
        r.setProductId(productId);
        r.setQuantity(quantity);
        r.setStatus(ReservationStatus.PENDING);
        return reservations.save(r);
    }

    public List<Order> getSlaWarningOrders() {
        LocalDateTime limit = LocalDateTime.now().plusHours(2);
        return orders.findAllByOrderByCreatedAtDesc().stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED && o.getStatus() != OrderStatus.DELIVERED)
                .filter(o -> o.getSlaDeadline() != null && !o.getSlaDeadline().isAfter(limit))
                .toList();
    }
}
