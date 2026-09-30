package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.Order;
import com.nguyenhoanglong.entity.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
<<<<<<< HEAD
import org.springframework.stereotype.Repository;
import java.util.List;
=======
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
>>>>>>> main

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserId(String userId);
    List<Order> findByUserIdOrderByCreatedAtDesc(String userId);
    Optional<Order> findByOrderCode(String orderCode);
    boolean existsByUserId(String userId);

    List<Order> findByStatusOrderByCreatedAtDesc(OrderStatus status);
    List<Order> findByStatusInOrderByCreatedAtDesc(List<OrderStatus> statuses);
    List<Order> findAllByOrderByCreatedAtDesc();
<<<<<<< HEAD
=======
    List<Order> findByCustomerPhoneOrderByCreatedAtDesc(String customerPhone);

    List<Order> findByShopIdOrderByCreatedAtDesc(Long shopId);
    List<Order> findByShopIdAndStatusInOrderByCreatedAtDesc(Long shopId, List<OrderStatus> statuses);

    // Phan trang & tong hop o tang DB: tranh load toan bo don hang roi cat trong bo nho.
    Page<Order> findByShopId(Long shopId, Pageable pageable);
    Page<Order> findByShopIdAndStatus(Long shopId, OrderStatus status, Pageable pageable);

    long countByStatusIn(List<OrderStatus> statuses);

    @Query("SELECT COALESCE(o.status, null) AS status, COUNT(o) AS cnt, COALESCE(SUM(o.totalAmount), 0) AS amount "
            + "FROM Order o WHERE o.shopId = :shopId GROUP BY o.status")
    List<Object[]> aggregateByStatusForShop(@Param("shopId") Long shopId);

    @Query("SELECT CAST(o.createdAt AS date) AS day, COUNT(o) AS cnt, "
            + "COALESCE(SUM(CASE WHEN o.status = :deliveredStatus THEN o.totalAmount ELSE 0 END), 0) AS revenue "
            + "FROM Order o WHERE o.shopId = :shopId AND o.createdAt >= :from "
            + "GROUP BY CAST(o.createdAt AS date)")
    List<Object[]> aggregateDailyForShop(@Param("shopId") Long shopId,
                                         @Param("from") java.time.LocalDateTime from,
                                         @Param("deliveredStatus") OrderStatus deliveredStatus);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o "
            + "WHERE o.shopId = :shopId AND o.status = :status AND o.createdAt >= :from AND o.createdAt < :to")
    Double sumAmountForShopByStatusBetween(@Param("shopId") Long shopId,
                                           @Param("status") OrderStatus status,
                                           @Param("from") java.time.LocalDateTime from,
                                           @Param("to") java.time.LocalDateTime to);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.shopId IS NULL")
    Long countOrdersWithoutShopId();

    @Modifying
    @Query("UPDATE Order o SET o.shopId = :shopId WHERE o.shopId IS NULL")
    void backfillShopId(@Param("shopId") Long shopId);
>>>>>>> main
}
