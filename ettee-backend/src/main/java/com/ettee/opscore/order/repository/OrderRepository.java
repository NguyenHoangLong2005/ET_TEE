package com.ettee.opscore.order.repository;

import com.ettee.opscore.order.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {

       Optional<Order> findByOrderCode(String orderCode);

       @Query(value = """
                     select o.*
                     from ettee.orders o
                     where (:keyword is null or o.order_code ilike '%' || cast(:keyword as text) || '%'
                            or o.customer_phone like '%' || cast(:keyword as text) || '%'
                            or o.customer_name ilike '%' || cast(:keyword as text) || '%')
                       and (:status is null or o.status::text = :status)
                     order by o.placed_at desc
                     """, countQuery = """
                     select count(*)
                     from ettee.orders o
                     where (:keyword is null or o.order_code ilike '%' || cast(:keyword as text) || '%'
                            or o.customer_phone like '%' || cast(:keyword as text) || '%'
                            or o.customer_name ilike '%' || cast(:keyword as text) || '%')
                       and (:status is null or o.status::text = :status)
                     """, nativeQuery = true)
       Page<Order> search(@Param("keyword") String keyword,
                     @Param("status") String status,
                     Pageable pageable);

       @Query("select coalesce(sum(o.total),0) from Order o where o.placedAt between :from and :to and o.status <> 'cancelled'")
       BigDecimal sumRevenue(@Param("from") Instant from, @Param("to") Instant to);

       @Query("select count(o) from Order o where o.placedAt between :from and :to")
       long countOrders(@Param("from") Instant from, @Param("to") Instant to);

       @Query("select count(o) from Order o where o.placedAt between :from and :to and o.status = 'cancelled'")
       long countCancelled(@Param("from") Instant from, @Param("to") Instant to);

       @Query("select count(o) from Order o where o.placedAt between :from and :to and o.status = 'returned'")
       long countReturned(@Param("from") Instant from, @Param("to") Instant to);

       @Query("""
                     select o.status as status, count(o) as cnt from Order o
                     where o.placedAt between :from and :to
                     group by o.status
                     """)
       List<Object[]> countByStatus(@Param("from") Instant from, @Param("to") Instant to);

       List<Order> findAllByCustomerPhoneOrderByPlacedAtDesc(String phone);

       List<Order> findAllByCustomerIdOrderByPlacedAtDesc(UUID customerId);
}
