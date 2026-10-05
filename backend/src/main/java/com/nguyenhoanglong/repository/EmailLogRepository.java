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
            + "AND UPPER(COALESCE(e.status, '')) LIKE :status "
            + "AND e.createdAt >= :fromTime AND e.createdAt < :toTime "
            + "AND (:onlyOpened = false OR e.openedAt IS NOT NULL) "
            + "AND (:onlyUnopened = false OR e.openedAt IS NULL)")
    org.springframework.data.domain.Page<EmailLog> searchLogs(
            @org.springframework.data.repository.query.Param("search") String search,
            @org.springframework.data.repository.query.Param("status") String status,
            @org.springframework.data.repository.query.Param("fromTime") java.time.LocalDateTime fromTime,
            @org.springframework.data.repository.query.Param("toTime") java.time.LocalDateTime toTime,
            @org.springframework.data.repository.query.Param("onlyOpened") boolean onlyOpened,
            @org.springframework.data.repository.query.Param("onlyUnopened") boolean onlyUnopened,
            org.springframework.data.domain.Pageable pageable);

    /** Atomic: safe when several opens arrive at once. Returns the rows updated (0 for an unknown token). */
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE EmailLog e SET e.openCount = e.openCount + 1, "
            + "e.lastOpenedAt = :now, e.openedAt = COALESCE(e.openedAt, :now) WHERE e.trackingToken = :token")
    int recordOpen(@org.springframework.data.repository.query.Param("token") String token,
                   @org.springframework.data.repository.query.Param("now") java.time.LocalDateTime now);

    long countByOpenedAtIsNotNull();

    long countByTrackingTokenIsNotNullAndStatus(String status);

    // Counts over the WHOLE log (not just the visible page) for the summary cards.
    @org.springframework.data.jpa.repository.Query("SELECT UPPER(COALESCE(e.status, '')), COUNT(e) FROM EmailLog e "
            + "GROUP BY UPPER(COALESCE(e.status, ''))")
    java.util.List<Object[]> countByStatus();
}
