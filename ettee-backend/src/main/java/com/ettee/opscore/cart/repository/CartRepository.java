package com.ettee.opscore.cart.repository;

import com.ettee.opscore.cart.entity.Cart;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface CartRepository extends JpaRepository<Cart, UUID> {
    Optional<Cart> findByUserIdAndStatus(UUID userId, String status);
}