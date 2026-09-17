package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.ProofOfDelivery;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProofOfDeliveryRepository
        extends JpaRepository<ProofOfDelivery, Long> {

    // Tim bang chung giao hang theo ID don hang
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
    List<ProofOfDelivery> findByOrderId(
        @Param("orderId") Long orderId
    );

    // Tim bang chung theo don hang va trang thai van chuyen
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
    List<ProofOfDelivery> findByOrderIdAndStatus(
        @Param("orderId") Long orderId,
        @Param("status") String status
    );
}