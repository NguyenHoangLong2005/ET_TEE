package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.Order;
import com.nguyenhoanglong.entity.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    /** Orders still in progress (not delivered/cancelled/returned/refunded) that contain the product. */
    @org.springframework.data.jpa.repository.Query(value = "SELECT COUNT(DISTINCT o.id) FROM order_items oi " +
            "JOIN orders o ON o.id = oi.order_id " +
            "WHERE oi.product_id = :productId AND o.status IN (:openStatuses)", nativeQuery = true)
    long countOpenOrdersByProductId(@org.springframework.data.repository.query.Param("productId") Long productId,
                                    @org.springframework.data.repository.query.Param("openStatuses") java.util.Collection<String> openStatuses);

    List<Order> findByUserId(String userId);
    List<Order> findByUserIdOrderByCreatedAtDesc(String userId);
    Optional<Order> findByOrderCode(String orderCode);
    boolean existsByUserId(String userId);

    List<Order> findByStatusOrderByCreatedAtDesc(OrderStatus status);
    List<Order> findByStatusAndCreatedAtBefore(OrderStatus status, java.time.LocalDateTime cutoff);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.voucherId = :voucherId "
            + "AND o.status <> com.nguyenhoanglong.entity.OrderStatus.CANCELLED "
            + "AND (LOWER(o.customerEmail) = LOWER(:email) OR o.customerPhone = :phone)")
    long countVoucherUsesByContact(@Param("voucherId") Long voucherId,
                                   @Param("email") String email,
                                   @Param("phone") String phone);
    List<Order> findByStatusInOrderByCreatedAtDesc(List<OrderStatus> statuses);
    List<Order> findAllByOrderByCreatedAtDesc();
    List<Order> findByCustomerPhoneOrderByCreatedAtDesc(String customerPhone);

    List<Order> findByShopIdOrderByCreatedAtDesc(Long shopId);
    List<Order> findByShopIdAndStatusInOrderByCreatedAtDesc(Long shopId, List<OrderStatus> statuses);

    // Phan trang & tong hop o tang DB: tranh load toan bo don hang roi cat trong bo nho.
    Page<Order> findByShopId(Long shopId, Pageable pageable);
    Page<Order> findByShopIdAndStatus(Long shopId, OrderStatus status, Pageable pageable);

    // Every named parameter appears exactly once (a repeated one breaks the generated count query).
    // Callers pass a placeholder status and filterStatus=false when not filtering by status.
    @Query("SELECT o FROM Order o WHERE o.shopId = :shopId "
            + "AND (:filterStatus = false OR o.status = :status) "
            + "AND o.createdAt >= :from AND o.createdAt < :to "
            + "AND LOWER(CONCAT(COALESCE(o.orderCode, ''), ' ', COALESCE(o.customerName, ''), ' ', COALESCE(o.customerPhone, ''))) LIKE :search")
    Page<Order> searchForShop(@Param("shopId") Long shopId,
                              @Param("filterStatus") boolean filterStatus,
                              @Param("status") OrderStatus status,
                              @Param("from") java.time.LocalDateTime from,
                              @Param("to") java.time.LocalDateTime to,
                              @Param("search") String search,
                              Pageable pageable);

    long countByStatusIn(List<OrderStatus> statuses);

    // ── Dashboard ban hang: tong hop o DB, chi lay vai dong can hien thi ──
    @Query("SELECT o.status, COUNT(o), COALESCE(SUM(o.totalAmount), 0) FROM Order o GROUP BY o.status")
    List<Object[]> aggregateByStatusAll();

    @Query("SELECT o.status, COUNT(o), COALESCE(SUM(o.totalAmount), 0) FROM Order o "
            + "WHERE o.createdAt >= :from AND o.createdAt < :to GROUP BY o.status")
    List<Object[]> aggregateByStatusAllBetween(@Param("from") java.time.LocalDateTime from,
                                               @Param("to") java.time.LocalDateTime to);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.shopId = :shopId AND o.slaDeadline IS NOT NULL "
            + "AND o.slaDeadline <= :limit AND o.status NOT IN (:excluded)")
    long countSlaWarningForShop(@Param("shopId") Long shopId,
                                @Param("limit") java.time.LocalDateTime limit,
                                @Param("excluded") List<OrderStatus> excluded);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.slaDeadline IS NOT NULL "
            + "AND o.slaDeadline <= :limit AND o.status NOT IN (:excluded)")
    long countSlaWarningAll(@Param("limit") java.time.LocalDateTime limit,
                            @Param("excluded") List<OrderStatus> excluded);

    // Man hinh danh sach don cua nhan vien ban hang: loc trang thai + SLA + tim kiem, phan trang o DB.
    @Query("SELECT o FROM Order o WHERE o.shopId = :shopId AND o.status IN :statuses "
            + "AND (:slaOnly = false OR o.slaDeadline <= :slaLimit) "
            + "AND LOWER(CONCAT(COALESCE(o.orderCode, ''), ' ', COALESCE(o.customerName, ''), ' ', COALESCE(o.customerPhone, ''))) LIKE :search")
    Page<Order> searchSalesOrdersForShop(@Param("shopId") Long shopId,
                                         @Param("statuses") List<OrderStatus> statuses,
                                         @Param("slaOnly") boolean slaOnly,
                                         @Param("slaLimit") java.time.LocalDateTime slaLimit,
                                         @Param("search") String search,
                                         Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.status IN :statuses "
            + "AND (:slaOnly = false OR o.slaDeadline <= :slaLimit) "
            + "AND LOWER(CONCAT(COALESCE(o.orderCode, ''), ' ', COALESCE(o.customerName, ''), ' ', COALESCE(o.customerPhone, ''))) LIKE :search")
    Page<Order> searchSalesOrdersAll(@Param("statuses") List<OrderStatus> statuses,
                                     @Param("slaOnly") boolean slaOnly,
                                     @Param("slaLimit") java.time.LocalDateTime slaLimit,
                                     @Param("search") String search,
                                     Pageable pageable);

    List<Order> findByStatusAndSlaDeadlineIsNull(OrderStatus status);

    Page<Order> findByShopIdAndStatusIn(Long shopId, List<OrderStatus> statuses, Pageable pageable);
    Page<Order> findByStatusIn(List<OrderStatus> statuses, Pageable pageable);

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

    // Same as aggregateByStatusForShop, limited to orders CREATED in [from, to).
    @Query("SELECT COALESCE(o.status, null) AS status, COUNT(o) AS cnt, COALESCE(SUM(o.totalAmount), 0) AS amount "
            + "FROM Order o WHERE o.shopId = :shopId AND o.createdAt >= :from AND o.createdAt < :to GROUP BY o.status")
    List<Object[]> aggregateByStatusForShopBetween(@Param("shopId") Long shopId,
                                                   @Param("from") java.time.LocalDateTime from,
                                                   @Param("to") java.time.LocalDateTime to);

    // Per-day order count + delivered revenue for orders created in [from, to).
    @Query("SELECT CAST(o.createdAt AS date) AS day, COUNT(o) AS cnt, "
            + "COALESCE(SUM(CASE WHEN o.status = :deliveredStatus THEN o.totalAmount ELSE 0 END), 0) AS revenue "
            + "FROM Order o WHERE o.shopId = :shopId AND o.createdAt >= :from AND o.createdAt < :to "
            + "GROUP BY CAST(o.createdAt AS date)")
    List<Object[]> aggregateDailyForShopBetween(@Param("shopId") Long shopId,
                                                @Param("from") java.time.LocalDateTime from,
                                                @Param("to") java.time.LocalDateTime to,
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
}
