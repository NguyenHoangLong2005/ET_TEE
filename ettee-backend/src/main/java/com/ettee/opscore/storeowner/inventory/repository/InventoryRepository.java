package com.ettee.opscore.storeowner.inventory.repository;

import com.ettee.opscore.storeowner.inventory.entity.Inventory;
import com.ettee.opscore.storeowner.inventory.entity.InventoryId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InventoryRepository extends JpaRepository<Inventory, InventoryId> {

    // Khóa dòng (SELECT ... FOR UPDATE) để tránh race-condition khi nhiều request
    // cùng trừ/cộng tồn kho.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Inventory i where i.id.variantId = :variantId and i.id.locationId = :locationId")
    Optional<Inventory> lockByVariantAndLocation(@Param("variantId") UUID variantId,
            @Param("locationId") UUID locationId);

    List<Inventory> findAllByIdVariantId(UUID variantId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Inventory i where i.id.variantId = :variantId and i.quantityOnHand - i.quantityReserved > 0 order by i.quantityOnHand - i.quantityReserved desc")
    List<Inventory> lockAvailableByVariant(@Param("variantId") UUID variantId);

    @Query("select i from Inventory i where i.quantityOnHand - i.quantityReserved <= i.reorderLevel")
    Page<Inventory> findLowStock(Pageable pageable);
}
