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
        this.orders = orders; this.notes = notes; this.reservations = reservations;
    }

    private static final List<OrderStatus> PENDING_SALES_STATUSES =
            List.of(OrderStatus.PENDING_PAYMENT, OrderStatus.PENDING_CONFIRMATION);

    public List<Order> getAllOrders() { return orders.findAllByOrderByCreatedAtDesc(); }

    public List<Order> getNewOrders() {
        return orders.findByStatusInOrderByCreatedAtDesc(PENDING_SALES_STATUSES);
    }

    public Order getOrder(Long id) { return orders.findById(id).orElseThrow(() -> new IllegalArgumentException("Khong tim thay don hang " + id)); }
    public List<OrderNote> getOrderNotes(Long id) { getOrder(id); return notes.findByOrderIdOrderByCreatedAtDesc(id); }

    @Transactional
    public Order verifyOrder(Long id, String name, String phone, String address) {
        Order order = getOrder(id);
        if (!PENDING_SALES_STATUSES.contains(order.getStatus())) throw new IllegalArgumentException("Chi xac minh duoc don dang cho xac nhan");
        if (name != null && !name.isBlank()) order.setCustomerName(name.trim());
        order.setCustomerPhone(phone);
        order.setShippingAddress(address);
        order.setUpdatedAt(LocalDateTime.now());
        return orders.save(order);
    }

    @Transactional
    public Order confirmOrder(Long id) {
        Order order = getOrder(id);
        if (order.getStatus() != OrderStatus.PENDING_CONFIRMATION) throw new IllegalArgumentException("Don phai o trang thai pending_confirmation truoc khi xac nhan");
        order.setStatus(OrderStatus.CONFIRMED);
        order.setUpdatedAt(LocalDateTime.now());
        return orders.save(order);
    }

    @Transactional
    public Order cancelOrder(Long id, String reason) {
        Order order = getOrder(id);
        if (order.getStatus() == OrderStatus.DELIVERED || order.getStatus() == OrderStatus.CANCELLED) throw new IllegalArgumentException("Don da giao hoac da huy khong the huy");
        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelReason(reason);
        order.setUpdatedAt(LocalDateTime.now());
        return orders.save(order);
    }

    public OrderNote addNote(Long orderId, String content, Long userId) {
        if (content == null || content.isBlank()) throw new IllegalArgumentException("Noi dung ghi chu khong duoc de trong");
        OrderNote note = new OrderNote();
        note.setOrderId(orderId);
        note.setContent(content.trim());
        note.setCreatedBy(userId);
        return notes.save(note);
    }

    public StockReservation requestReservation(Long orderId, Long productId, Integer quantity) {
        Order order = getOrder(orderId);
        if (order.getStatus() != OrderStatus.CONFIRMED) throw new IllegalArgumentException("Don phai o trang thai confirmed truoc khi yeu cau giu hang");
        if (quantity == null || quantity <= 0) throw new IllegalArgumentException("So luong giu phai lon hon 0");
        StockReservation r = new StockReservation();
        r.setOrderId(orderId);
        r.setProductId(productId);
        r.setQuantity(quantity);
        r.setStatus(ReservationStatus.PENDING);
        return reservations.save(r);
    }
}
