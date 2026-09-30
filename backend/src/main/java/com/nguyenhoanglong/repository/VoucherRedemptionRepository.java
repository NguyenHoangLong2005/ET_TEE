package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.VoucherRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VoucherRedemptionRepository extends JpaRepository<VoucherRedemption, Long> {
    List<VoucherRedemption> findByVoucherIdAndUserId(Long voucherId, String userId);
    long countByVoucherIdAndUserId(Long voucherId, String userId);
    long countByVoucherId(Long voucherId);
    boolean existsByVoucherId(Long voucherId);
    long countByCreatedAtAfter(java.time.LocalDateTime since);

    @org.springframework.data.jpa.repository.Query("SELECT r.voucherId, COUNT(r), COALESCE(SUM(r.discountAmount), 0), COALESCE(AVG(r.orderTotal), 0) " +
           "FROM VoucherRedemption r WHERE r.createdAt >= :since GROUP BY r.voucherId")
    List<Object[]> aggregateVoucherRedemptionsSince(@org.springframework.data.repository.query.Param("since") java.time.LocalDateTime since);

    @org.springframework.data.jpa.repository.Query("SELECT r.voucherId, COUNT(r), COALESCE(SUM(r.discountAmount), 0), COALESCE(AVG(r.orderTotal), 0) " +
           "FROM VoucherRedemption r GROUP BY r.voucherId")
    List<Object[]> aggregateVoucherRedemptions();
}
