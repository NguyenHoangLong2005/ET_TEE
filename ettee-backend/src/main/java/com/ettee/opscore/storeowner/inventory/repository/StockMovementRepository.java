package com.ettee.opscore.storeowner.inventory.repository;

import com.ettee.opscore.storeowner.inventory.entity.StockMovement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {
    Page<StockMovement> findAllByVariantIdOrderByCreatedAtDesc(UUID variantId, Pageable pageable);
}
