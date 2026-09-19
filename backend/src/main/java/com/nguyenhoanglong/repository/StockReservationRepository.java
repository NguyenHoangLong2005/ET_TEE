package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.ReservationStatus;
import com.nguyenhoanglong.entity.StockReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface StockReservationRepository extends JpaRepository<StockReservation, UUID> {
    List<StockReservation> findByStatusOrderByCreatedAtAsc(ReservationStatus status);
    List<StockReservation> findByOrderId(UUID orderId);
}
