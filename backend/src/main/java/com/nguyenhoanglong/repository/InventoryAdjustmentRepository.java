package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.InventoryAdjustment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InventoryAdjustmentRepository extends JpaRepository<InventoryAdjustment, Long> {
}
