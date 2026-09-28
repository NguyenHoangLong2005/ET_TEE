package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.CodReconciliation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CodReconciliationRepository extends JpaRepository<CodReconciliation, Long> {
    Optional<CodReconciliation> findByReconciliationCode(String reconciliationCode);
    Page<CodReconciliation> findByShopIdOrderByCreatedAtDesc(Long shopId, Pageable pageable);
    Page<CodReconciliation> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
