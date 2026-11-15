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

    /** Statuses before the parcel gets a waybill: the COD amount is not fixed on a shipment yet. */
    private static final java.util.Set<OrderStatus> BEFORE_SHIPMENT = java.util.EnumSet.of(
            OrderStatus.PENDING_CONFIRMATION, OrderStatus.CONFIRMED, OrderStatus.PICKING, OrderStatus.PACKED);

    /** True while the order is the normal case: a bank transfer still waited for. */
    public static boolean isAwaitingTransfer(Order order) {
        return "BANK_TRANSFER".equalsIgnoreCase(order.getPaymentMethod())
                && order.getStatus() == OrderStatus.PENDING_PAYMENT && !isPaid(order);
    }

    /**
     * A full payment arrived for an order that no longer waits for one. The money used to be
     * dropped with a log line: a cancelled order kept no trace of the refund owed, and an order
     * the customer had switched to COD was charged a second time on delivery.
     * <ul>
     *   <li>Cancelled, unpaid: flagged REFUND_PENDING so staff return the money.</li>
     *   <li>Switched to COD and not yet with the courier: it is a paid bank-transfer order again.</li>
     *   <li>Anything else: left as is, staff are told to check it.</li>
     * </ul>
     * Idempotent: a retried webhook finds the order already flagged and does nothing.
     */
    @Transactional
    public Order recordLatePayment(Order order, String changedBy, String detail) {
        String paymentStatus = order.getPaymentStatus();
        OrderStatus status = order.getStatus();
        if (isPaid(order) || "REFUND_PENDING".equalsIgnoreCase(paymentStatus) || "REFUNDED".equalsIgnoreCase(paymentStatus)) {
            return order;
        }
        String reason;
        if (status == OrderStatus.CANCELLED) {
            order.setPaymentStatus("REFUND_PENDING");
            reason = "Nhận được tiền sau khi đơn đã hủy, cần hoàn tiền cho khách. " + detail;
        } else if ("COD".equalsIgnoreCase(order.getPaymentMethod()) && "COD_PENDING".equalsIgnoreCase(paymentStatus)
                && BEFORE_SHIPMENT.contains(status)) {
            order.setPaymentMethod("BANK_TRANSFER");
            order.setPaymentStatus("PAID");
            reason = "Khách đã chuyển khoản sau khi đổi sang COD: đơn chuyển lại thành đã thanh toán, không thu hộ. " + detail;
        } else {
            salesNotificationService.notifyPaymentNeedsAttention(order, "Tiền chuyển khoản cần kiểm tra",
                    "Đơn " + order.getOrderCode() + " (" + status + ") nhận được chuyển khoản ngoài luồng. " + detail);
            return order;
        }
        order.setUpdatedAt(LocalDateTime.now());
        Order saved = orders.save(order);

        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrderId(saved.getId());
        history.setFromStatus(status != null ? status.name() : null);
        history.setStatus(status != null ? status.name() : null);
        history.setChangedBy(changedBy);
        history.setReason(reason);
        historyRepository.save(history);

        salesNotificationService.notifyPaymentNeedsAttention(saved,
                status == OrderStatus.CANCELLED ? "Đơn đã hủy cần hoàn tiền" : "Đơn COD đã được chuyển khoản",
                "Đơn " + saved.getOrderCode() + ": " + reason);
        return saved;
    }

    public static boolean isPaid(Order order) {
        return "PAID".equalsIgnoreCase(order.getPaymentStatus());
    }
}
