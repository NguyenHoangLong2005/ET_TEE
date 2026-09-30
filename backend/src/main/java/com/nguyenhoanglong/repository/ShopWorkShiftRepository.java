package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.ShopWorkShift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ShopWorkShiftRepository extends JpaRepository<ShopWorkShift, Long> {

    List<ShopWorkShift> findByShopIdAndShiftDateBetween(Long shopId, LocalDate startDate, LocalDate endDate);

    List<ShopWorkShift> findByShopIdAndUserId(Long shopId, String userId);

    List<ShopWorkShift> findByShopId(Long shopId);
}
