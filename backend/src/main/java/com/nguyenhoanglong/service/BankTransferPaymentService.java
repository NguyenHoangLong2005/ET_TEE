package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.Order;
import com.nguyenhoanglong.entity.OrderStatus;
import com.nguyenhoanglong.entity.OrderStatusHistory;
import com.nguyenhoanglong.repository.OrderRepository;
import com.nguyenhoanglong.repository.OrderStatusHistoryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

/**
 * Marks a bank-transfer order as paid. Nothing did this before: checkout leaves such orders in
 * PENDING_PAYMENT / WAITING_TRANSFER and sales staff can only confirm PENDING_CONFIRMATION, so a
 * customer who had transferred the money was stuck on the QR page forever.
 *
 * <p>Shared by the sales staff "Đã nhận tiền" action and the SePay webhook.
 */
@Service
public class BankTransferPaymentService {

    private final OrderRepository orders;
    private final OrderStatusHistoryRepository historyRepository;
    private final OrderStateMachine stateMachine;
    private final SalesNotificationService salesNotificationService;

    public BankTransferPaymentService(OrderRepository orders,
                                      OrderStatusHistoryRepository historyRepository,
                                      OrderStateMachine stateMachine,
                                      SalesNotificationService salesNotificationService) {
        this.orders = orders;
        this.historyRepository = historyRepository;
        this.stateMachine = stateMachine;
        this.salesNotificationService = salesNotificationService;
    }

    /**
     * Payment received: PENDING_PAYMENT -> PENDING_CONFIRMATION with payment status PAID, so the
     * order lands in the sales queue like a COD order. Idempotent for an order already paid
     * (webhooks are retried).
     */
    @Transactional
    public Order markPaid(Order order, String changedBy, String reason) {
        if (!"BANK_TRANSFER".equalsIgnoreCase(order.getPaymentMethod())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn hàng này không thanh toán bằng chuyển khoản");
        }
        if (isPaid(order)) {
            return order;
        }
        OrderStatus from = order.getStatus();
        if (from != OrderStatus.PENDING_PAYMENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn hàng không còn ở trạng thái chờ thanh toán");
        }
        stateMachine.validateTransition(from, OrderStatus.PENDING_CONFIRMATION);

        order.setPaymentStatus("PAID");
        order.setOrderStatus(OrderStatus.PENDING_CONFIRMATION.name());
        order.setUpdatedAt(LocalDateTime.now());
        Order saved = orders.save(order);

        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrderId(saved.getId());
        history.setFromStatus(from.name());
        history.setStatus(OrderStatus.PENDING_CONFIRMATION.name());
        history.setChangedBy(changedBy);
        history.setReason(reason);
        historyRepository.save(history);

        salesNotificationService.notifyNewOrderAwaitingConfirmation(saved);
        return saved;
    }

    public static boolean isPaid(Order order) {
        return "PAID".equalsIgnoreCase(order.getPaymentStatus());
    }
}
