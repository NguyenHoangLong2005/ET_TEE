package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    
    // "COMPLETED" khong ton tai trong OrderStatus va khong tung xuat hien trong du
    // lieu. Dung cot status (enum), khong dung orderStatus (String) vi cot do co
    // the NULL tren cac ban ghi cu (xem doi chieu du lieu trong docs/flyway.md).
    @Query("SELECT oi FROM OrderItem oi JOIN oi.order o WHERE o.user.id = :userId AND oi.product.id = :productId AND o.status = com.nguyenhoanglong.entity.OrderStatus.DELIVERED")
    List<OrderItem> findDeliveredItemsByUserAndProduct(@Param("userId") String userId, @Param("productId") Long productId);

    @Query("SELECT oi FROM OrderItem oi JOIN oi.order o WHERE o.user.id = :userId AND oi.product.id = :productId")
    List<OrderItem> findItemsByUserAndProduct(@Param("userId") String userId, @Param("productId") Long productId);
    
    @Query("SELECT o FROM Order o WHERE o.orderCode = :orderCode")
    com.nguyenhoanglong.entity.Order findOrderByCode(@Param("orderCode") String orderCode);

    @Query("SELECT oi FROM OrderItem oi JOIN oi.order o WHERE o.id = :orderId AND oi.product.id = :productId")
    List<OrderItem> findItemsByOrderAndProduct(@Param("orderId") Long orderId, @Param("productId") Long productId);
}
