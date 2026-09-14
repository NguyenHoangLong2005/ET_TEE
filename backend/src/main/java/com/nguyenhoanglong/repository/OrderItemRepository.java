package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    
    @Query("SELECT oi FROM OrderItem oi JOIN oi.order o WHERE o.user.id = :userId AND oi.product.id = :productId AND (o.orderStatus = 'DELIVERED' OR o.orderStatus = 'COMPLETED')")
    List<OrderItem> findDeliveredItemsByUserAndProduct(@Param("userId") String userId, @Param("productId") Long productId);

    @Query("SELECT oi FROM OrderItem oi JOIN oi.order o WHERE o.user.id = :userId AND oi.product.id = :productId")
    List<OrderItem> findItemsByUserAndProduct(@Param("userId") String userId, @Param("productId") Long productId);
    
    @Query("SELECT o FROM Order o WHERE o.orderCode = :orderCode")
    com.nguyenhoanglong.entity.Order findOrderByCode(@Param("orderCode") String orderCode);

    @Query("SELECT oi FROM OrderItem oi JOIN oi.order o WHERE o.id = :orderId AND oi.product.id = :productId")
    List<OrderItem> findItemsByOrderAndProduct(@Param("orderId") Long orderId, @Param("productId") Long productId);
}
