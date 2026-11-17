package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.Cart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CartRepository extends JpaRepository<Cart, Long> {
    Optional<Cart> findByUserId(String userId);
    Optional<Cart> findByGuestToken(String guestToken);

    /**
     * Checkout locks the cart row: a double-clicked "Đặt hàng" (or two tabs) used to turn one cart into
     * two orders, each deducting stock. The second request now waits, then finds the cart emptied.
     */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT c FROM Cart c WHERE c.user.id = :userId")
    Optional<Cart> findByUserIdForUpdate(@org.springframework.data.repository.query.Param("userId") String userId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT c FROM Cart c WHERE c.guestToken = :guestToken")
    Optional<Cart> findByGuestTokenForUpdate(@org.springframework.data.repository.query.Param("guestToken") String guestToken);
}
