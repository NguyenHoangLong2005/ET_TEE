package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.WishlistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WishlistItemRepository extends JpaRepository<WishlistItem, Long> {
    
    List<WishlistItem> findByUserIdOrderByCreatedAtDesc(String userId);
    
    List<WishlistItem> findByGuestTokenOrderByCreatedAtDesc(String guestToken);
    
    Optional<WishlistItem> findByUserIdAndProductId(String userId, Long productId);
    
    Optional<WishlistItem> findByGuestTokenAndProductId(String guestToken, Long productId);
    
    long countByUserId(String userId);
    
    long countByGuestToken(String guestToken);

    List<WishlistItem> findByGuestToken(String guestToken);
}
