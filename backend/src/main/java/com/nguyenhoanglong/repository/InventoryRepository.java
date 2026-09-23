package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, UUID> {
    Optional<Inventory> findByVariantId(UUID variantId);
    Optional<Inventory> findByProductId(Long productId);
}
