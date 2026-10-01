package com.nguyenhoanglong.config;

import com.nguyenhoanglong.entity.Order;
import com.nguyenhoanglong.entity.OrderStatus;
import com.nguyenhoanglong.repository.OrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/** Gan han SLA cho cac don dang cho xac nhan nhung chua co han (tao truoc khi co quy tac SLA). */
@Component
public class OrderSlaBackfill {
    private static final Logger log = LoggerFactory.getLogger(OrderSlaBackfill.class);

    private final OrderRepository orderRepository;

    public OrderSlaBackfill(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void backfill() {
        List<Order> pending = orderRepository.findByStatusAndSlaDeadlineIsNull(OrderStatus.PENDING_CONFIRMATION);
        for (Order o : pending) {
            LocalDateTime base = o.getCreatedAt() != null ? o.getCreatedAt() : LocalDateTime.now();
            o.setSlaDeadline(base.plusHours(Order.CONFIRMATION_SLA_HOURS));
        }
        if (!pending.isEmpty()) {
            orderRepository.saveAll(pending);
            log.info("Đã gán hạn SLA cho {} đơn đang chờ xác nhận", pending.size());
        }
    }
}
