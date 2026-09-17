package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.Order;
import com.nguyenhoanglong.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserId(String userId);
    List<Order> findByUserIdOrderByCreatedAtDesc(String userId);
    Optional<Order> findByOrderCode(String orderCode);
    boolean existsByUserId(String userId);

    List<Order> findByStatusOrderByCreatedAtDesc(OrderStatus status);
    List<Order> findByStatusInOrderByCreatedAtDesc(List<OrderStatus> statuses);
    List<Order> findAllByOrderByCreatedAtDesc();
}
