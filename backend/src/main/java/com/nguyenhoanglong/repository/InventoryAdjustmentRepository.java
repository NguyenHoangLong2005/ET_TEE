package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.InventoryAdjustment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryAdjustmentRepository extends JpaRepository<InventoryAdjustment, Long> {

    // JOIN FETCH inventory + loc theo shopId o tang DB: truoc day findAll() keo toan bo
    // bang adjustments roi doc adj.getInventory() cho tung dong.
    @org.springframework.data.jpa.repository.Query("SELECT a FROM InventoryAdjustment a "
            + "JOIN FETCH a.inventory i WHERE i.shopId = :shopId "
            + "AND UPPER(COALESCE(a.status, '')) IN ('PENDING', 'PENDING_APPROVAL')")
    java.util.List<InventoryAdjustment> findPendingApprovalByShopId(
            @org.springframework.data.repository.query.Param("shopId") Long shopId);

    @org.springframework.data.jpa.repository.Query("SELECT a FROM InventoryAdjustment a "
            + "JOIN FETCH a.inventory i WHERE i.shopId = :shopId")
    java.util.List<InventoryAdjustment> findByShopId(
            @org.springframework.data.repository.query.Param("shopId") Long shopId);
}
