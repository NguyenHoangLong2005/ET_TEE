package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.VoucherRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VoucherRedemptionRepository extends JpaRepository<VoucherRedemption, Long> {
    List<VoucherRedemption> findByVoucherIdAndUserId(Long voucherId, String userId);
    long countByVoucherIdAndUserId(Long voucherId, String userId);
}
