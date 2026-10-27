package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.Inventory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {
    Optional<Inventory> findByProductId(Long productId);

    /** Ton kho cua san pham TAI DUNG chi nhanh (findByProductId khong phan biet chi nhanh). */
    Optional<Inventory> findByProductIdAndShopId(Long productId, Long shopId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Inventory i WHERE i.productId = :productId")
    Optional<Inventory> findByProductIdWithLock(@Param("productId") Long productId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Inventory i WHERE i.id = :id")
    Optional<Inventory> findByIdWithLock(@Param("id") Long id);

    // Dem o tang DB thay vi findAll() roi filter theo shopId trong bo nho.
    long countByShopId(Long shopId);

    java.util.List<Inventory> findByShopId(Long shopId);

    /** Inventory rows outlive a soft-deleted product; low-stock views must not ask to restock those. */
    String LIVE_PRODUCT = " AND EXISTS (SELECT 1 FROM Product p WHERE p.id = i.productId AND p.status <> 'DELETED')";

    @Query("SELECT COUNT(i) FROM Inventory i WHERE i.shopId = :shopId "
            + "AND (i.quantityOnHand - i.quantityReserved) <= i.reorderLevel" + LIVE_PRODUCT)
    long countLowStockByShopId(@Param("shopId") Long shopId);

    @Query("SELECT i FROM Inventory i WHERE i.shopId = :shopId "
<<<<<<< HEAD
            + "AND (i.quantityOnHand - i.quantityReserved) <= i.reorderLevel")
    List<Inventory> findReplenishmentSuggestionsByShopId(@Param("shopId") Long shopId);

    @Query("SELECT i FROM Inventory i WHERE (i.quantityOnHand - i.quantityReserved) <= i.reorderLevel")
    List<Inventory> findAllReplenishmentSuggestions();
=======
            + "AND (i.quantityOnHand - i.quantityReserved) <= i.reorderLevel" + LIVE_PRODUCT)
    java.util.List<Inventory> findReplenishmentSuggestionsByShopId(@Param("shopId") Long shopId);

    @Query("SELECT i FROM Inventory i WHERE (i.quantityOnHand - i.quantityReserved) <= i.reorderLevel" + LIVE_PRODUCT)
    java.util.List<Inventory> findAllReplenishmentSuggestions();
>>>>>>> main
}
