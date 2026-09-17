package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.ReservationStatus;
import com.nguyenhoanglong.entity.StockReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface StockReservationRepository extends JpaRepository<StockReservation, Long> {
    List<StockReservation> findByStatusOrderByCreatedAtAsc(ReservationStatus status);
    List<StockReservation> findByOrderId(Long orderId);
}
