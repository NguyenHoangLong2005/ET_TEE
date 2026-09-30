package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.EmailLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {

    // Loc + phan trang o tang DB cho trang mailing logs.
    // Moi named parameter chi xuat hien DUNG 1 lan (xem ghi chu trong ActivityLogRepository).
    // Caller truyen '%' khi khong loc.
    @org.springframework.data.jpa.repository.Query("SELECT e FROM EmailLog e WHERE LOWER(CONCAT("
            + "COALESCE(e.recipient, ''), ' ', COALESCE(e.subject, ''))) LIKE :search "
            + "AND UPPER(COALESCE(e.status, '')) LIKE :status")
    org.springframework.data.domain.Page<EmailLog> searchLogs(
            @org.springframework.data.repository.query.Param("search") String search,
            @org.springframework.data.repository.query.Param("status") String status,
            org.springframework.data.domain.Pageable pageable);
}
