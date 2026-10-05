package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.Shipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ShipmentRepository extends JpaRepository<Shipment, Long> {
    Optional<Shipment> findByOrderId(Long orderId);

    boolean existsByTrackingCode(String trackingCode);

    boolean existsByTrackingCodeAndIdNot(String trackingCode, Long id);

    @org.springframework.data.jpa.repository.Query("SELECT s FROM Shipment s JOIN s.order o WHERE o.shopId = :shopId")
    java.util.List<Shipment> findByOrderShopId(@org.springframework.data.repository.query.Param("shopId") Long shopId);
}
