package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.ProofOfDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProofOfDeliveryRepository extends JpaRepository<ProofOfDelivery, UUID> {

    @Query(
        value = """
            SELECT p.*
            FROM proof_of_delivery p
            JOIN shipments s
                ON s.shipment_id = p.shipment_id
            WHERE s.order_id = :orderId
            """,
        nativeQuery = true
    )
    List<ProofOfDelivery> findByOrderId(@Param("orderId") UUID orderId);

    @Query(
        value = """
            SELECT p.*
            FROM proof_of_delivery p
            JOIN shipments s
                ON s.shipment_id = p.shipment_id
            WHERE s.order_id = :orderId
              AND s.status = :status
            """,
        nativeQuery = true
    )
    List<ProofOfDelivery> findByOrderIdAndStatus(@Param("orderId") UUID orderId, @Param("status") String status);
}
