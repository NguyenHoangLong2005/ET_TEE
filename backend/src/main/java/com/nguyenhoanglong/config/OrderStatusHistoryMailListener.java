package com.nguyenhoanglong.config;

import com.nguyenhoanglong.entity.OrderStatusHistory;
import com.nguyenhoanglong.service.OrderStatusNotificationService;
import jakarta.persistence.PostPersist;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * JPA listener: a new order_status_history row means the order changed status, so tell the
 * customer. The email is only sent AFTER the surrounding transaction commits - if the status
 * change rolls back, no misleading email goes out.
 */
@Component
public class OrderStatusHistoryMailListener {

    // Resolved lazily: Hibernate creates entity listeners early, before all beans are ready.
    private final ObjectProvider<OrderStatusNotificationService> notifier;

    public OrderStatusHistoryMailListener(ObjectProvider<OrderStatusNotificationService> notifier) {
        this.notifier = notifier;
    }

    @PostPersist
    public void afterInsert(OrderStatusHistory history) {
        final Long orderId = history.getOrderId();
        final String from = history.getFromStatus();
        final String to = history.getStatus();
        final String reason = history.getReason();
        if (orderId == null || to == null || from == null || from.isBlank() || from.equals(to)) return;

        Runnable send = () -> {
            OrderStatusNotificationService service = notifier.getIfAvailable();
            if (service != null) service.notifyStatusChange(orderId, from, to, reason);
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    send.run();
                }
            });
        } else {
            send.run();
        }
    }
}
