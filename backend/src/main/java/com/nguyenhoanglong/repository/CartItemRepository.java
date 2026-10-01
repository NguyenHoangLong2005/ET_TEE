package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    /** A deleted product is hidden by @SQLRestriction; a cart line pointing at it breaks the cart. */
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM cart_items WHERE product_variant_id IN "
            + "(SELECT id FROM product_variants WHERE product_id = :productId)", nativeQuery = true)
    int deleteByProductId(@org.springframework.data.repository.query.Param("productId") Long productId);
    Optional<CartItem> findByCartIdAndProductVariantId(Long cartId, Long variantId);
}
