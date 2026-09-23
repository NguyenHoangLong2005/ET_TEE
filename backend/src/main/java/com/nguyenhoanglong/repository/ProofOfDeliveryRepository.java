package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.ProofOfDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProofOfDeliveryRepository extends JpaRepository<ProofOfDelivery, Long> {

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
    List<ProofOfDelivery> findByOrderId(@Param("orderId") Long orderId);

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
    List<ProofOfDelivery> findByOrderIdAndStatus(@Param("orderId") Long orderId, @Param("status") String status);
}
