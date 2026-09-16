package com.ettee.opscore.cart.repository;

import com.ettee.opscore.cart.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CartItemRepository extends JpaRepository<CartItem, UUID> {
    List<CartItem> findAllByCartIdOrderByAddedAtAsc(UUID cartId);

    Optional<CartItem> findByCartIdAndVariantId(UUID cartId, UUID variantId);
}