package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.OrderLookupAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderLookupAuditLogRepository extends JpaRepository<OrderLookupAuditLog, Long> {
    Page<OrderLookupAuditLog> findByActorShopIdOrderByCreatedAtDesc(Long actorShopId, Pageable pageable);
    Page<OrderLookupAuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
