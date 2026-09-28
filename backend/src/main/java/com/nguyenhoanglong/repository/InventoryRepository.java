package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.Inventory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {
    Optional<Inventory> findByProductId(Long productId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Inventory i WHERE i.productId = :productId")
    Optional<Inventory> findByProductIdWithLock(@Param("productId") Long productId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Inventory i WHERE i.id = :id")
    Optional<Inventory> findByIdWithLock(@Param("id") Long id);

    // Dem o tang DB thay vi findAll() roi filter theo shopId trong bo nho.
    long countByShopId(Long shopId);

    @Query("SELECT COUNT(i) FROM Inventory i WHERE i.shopId = :shopId "
            + "AND (i.quantityOnHand - i.quantityReserved) <= i.reorderLevel")
    long countLowStockByShopId(@Param("shopId") Long shopId);

    @Query("SELECT i FROM Inventory i WHERE i.shopId = :shopId "
            + "AND (i.quantityOnHand - i.quantityReserved) <= i.reorderLevel")
    java.util.List<Inventory> findReplenishmentSuggestionsByShopId(@Param("shopId") Long shopId);

    @Query("SELECT i FROM Inventory i WHERE (i.quantityOnHand - i.quantityReserved) <= i.reorderLevel")
    java.util.List<Inventory> findAllReplenishmentSuggestions();
}

