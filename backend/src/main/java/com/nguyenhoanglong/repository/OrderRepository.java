package com.nguyenhoanglong.repository;
import com.nguyenhoanglong.entity.Order;
import com.nguyenhoanglong.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByStatusOrderByCreatedAtDesc(OrderStatus status);
    List<Order> findByStatusInOrderByCreatedAtDesc(List<OrderStatus> statuses);
    List<Order> findAllByOrderByCreatedAtDesc();
} 