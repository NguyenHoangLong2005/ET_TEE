package com.ettee.opscore.storeowner.inventory.repository;

import com.ettee.opscore.storeowner.inventory.entity.ApprovalStatus;
import com.ettee.opscore.storeowner.inventory.entity.StockAdjustmentRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface StockAdjustmentRequestRepository extends JpaRepository<StockAdjustmentRequest, UUID> {
    Page<StockAdjustmentRequest> findAllByStatusOrderByCreatedAtDesc(ApprovalStatus status, Pageable pageable);
    Page<StockAdjustmentRequest> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
