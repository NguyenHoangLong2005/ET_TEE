package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.UserBehaviorEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface UserBehaviorEventRepository extends JpaRepository<UserBehaviorEvent, Long> {

    /** Current price of an ACTIVE product; empty when the product is missing or not on sale. */
    @Query("SELECT COALESCE(p.salePrice, p.price) FROM Product p WHERE p.id = :productId AND p.status = 'ACTIVE'")
    List<java.math.BigDecimal> findActiveProductPrice(@Param("productId") Long productId);

    /** [productId, current price] of a variant. */
    @Query("SELECT pv.product.id, COALESCE(pv.salePrice, pv.price) FROM ProductVariant pv WHERE pv.id = :variantId")
    List<Object[]> findVariantProductAndPrice(@Param("variantId") Long variantId);

    /** [productId, unitPrice, quantity] of every line of an order. */
    @Query("SELECT oi.product.id, oi.unitPrice, oi.quantity FROM OrderItem oi WHERE oi.order.orderCode = :orderCode")
    List<Object[]> findOrderLines(@Param("orderCode") String orderCode);

    /** Most recent first; the recommender reverses it into a chronological sequence. */
    @Query("SELECT e.productId FROM UserBehaviorEvent e WHERE e.userId = :userId AND e.eventType IN :types " +
           "ORDER BY e.createdAt DESC, e.id DESC")
    List<Long> findRecentProductIds(@Param("userId") String userId, @Param("types") List<String> types,
                                    org.springframework.data.domain.Pageable pageable);

    /** A guest who signs in keeps the browsing history recorded under their guest key. */
    @Modifying
    @Transactional
    @Query("UPDATE UserBehaviorEvent e SET e.userId = :userId WHERE e.userId = :guestKey")
    int reassignUser(@Param("guestKey") String guestKey, @Param("userId") String userId);
}
