package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.CodReconciliationItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CodReconciliationItemRepository extends JpaRepository<CodReconciliationItem, Long> {
    Optional<CodReconciliationItem> findByShipmentId(Long shipmentId);
    boolean existsByShipmentId(Long shipmentId);
}
