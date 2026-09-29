package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.Shipment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ShipmentRepository extends JpaRepository<Shipment, Long> {
    Optional<Shipment> findByOrderId(Long orderId);

    @org.springframework.data.jpa.repository.Query("SELECT s FROM Shipment s JOIN s.order o WHERE o.shopId = :shopId")
    java.util.List<Shipment> findByOrderShopId(@org.springframework.data.repository.query.Param("shopId") Long shopId);
}
