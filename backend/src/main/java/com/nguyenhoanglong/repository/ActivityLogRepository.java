package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByCreatedAtAfter(LocalDateTime createdAt);

    // Dem o tang DB thay vi load toan bo log roi filter bang stream.
    @org.springframework.data.jpa.repository.Query("SELECT COUNT(a) FROM ActivityLog a "
            + "WHERE a.createdAt > :since AND (UPPER(a.action) = 'ERROR' OR LOWER(a.description) LIKE '%error%')")
    long countErrorsSince(@org.springframework.data.repository.query.Param("since") LocalDateTime since);

    // Tim kiem + phan trang o tang DB cho trang audit-logs.
    // Gop cac cot can tim vao mot bieu thuc de :search chi xuat hien DUNG 1 lan:
    // khi mot named parameter lap lai nhieu lan, Hibernate doi ten no luc viet lai
    // query cho phan trang va bao "No argument for named parameter ':search_1'".
    // Caller truyen '%' khi khong loc.
    @org.springframework.data.jpa.repository.Query("SELECT a FROM ActivityLog a WHERE LOWER(CONCAT("
            + "COALESCE(a.action, ''), ' ', COALESCE(a.description, ''), ' ', "
            + "COALESCE(a.userId, ''), ' ', COALESCE(a.targetEntity, ''))) LIKE :search")
    org.springframework.data.domain.Page<ActivityLog> searchLogs(
            @org.springframework.data.repository.query.Param("search") String search,
            org.springframework.data.domain.Pageable pageable);
}
