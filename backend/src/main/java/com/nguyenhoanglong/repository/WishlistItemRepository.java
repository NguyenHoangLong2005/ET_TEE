package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.WishlistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WishlistItemRepository extends JpaRepository<WishlistItem, Long> {

    /** See CartItemRepository.deleteByProductId: a wishlist entry of a deleted product breaks the list. */
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM wishlist_items WHERE product_id = :productId", nativeQuery = true)
    int deleteAllByDeletedProductId(@org.springframework.data.repository.query.Param("productId") Long productId);
    
    List<WishlistItem> findByUserIdOrderByCreatedAtDesc(String userId);
    
    List<WishlistItem> findByGuestTokenOrderByCreatedAtDesc(String guestToken);
    
    Optional<WishlistItem> findByUserIdAndProductId(String userId, Long productId);
    
    Optional<WishlistItem> findByGuestTokenAndProductId(String guestToken, Long productId);
    
    long countByUserId(String userId);
    
    long countByGuestToken(String guestToken);

    List<WishlistItem> findByGuestToken(String guestToken);
}
