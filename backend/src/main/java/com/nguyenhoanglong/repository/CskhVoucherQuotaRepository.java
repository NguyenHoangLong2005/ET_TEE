package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.CskhVoucherQuota;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CskhVoucherQuotaRepository extends JpaRepository<CskhVoucherQuota, Long> {
    Optional<CskhVoucherQuota> findByStaffIdAndPeriod(String staffId, String period);
}
