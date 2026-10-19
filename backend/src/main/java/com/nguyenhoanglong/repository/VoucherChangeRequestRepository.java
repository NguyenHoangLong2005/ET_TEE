package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.VoucherChangeRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface VoucherChangeRequestRepository extends JpaRepository<VoucherChangeRequest, Long> {
    Optional<VoucherChangeRequest> findFirstByVoucherIdAndStatus(Long voucherId, String status);

    List<VoucherChangeRequest> findByStatus(String status);

    /** Cung quy uoc voi voucher: yeu cau khong gan chi nhanh hien cho moi chu cua hang. */
    @Query("SELECT r FROM VoucherChangeRequest r WHERE r.status = 'PENDING' AND (r.shopId IS NULL OR r.shopId = :shopId) ORDER BY r.createdAt")
    List<VoucherChangeRequest> findPendingForShop(@Param("shopId") Long shopId);
}
