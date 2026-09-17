package com.ettee.opscore.systemops.repository;

import com.ettee.opscore.systemops.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    @Query("""
           select a from AuditLog a
           where (:entityType is null or a.entityType = :entityType)
           order by a.createdAt desc
           """)
    Page<AuditLog> search(@Param("entityType") String entityType, Pageable pageable);
}
