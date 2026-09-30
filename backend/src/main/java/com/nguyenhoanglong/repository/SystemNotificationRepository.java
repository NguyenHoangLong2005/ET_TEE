package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.SystemNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SystemNotificationRepository extends JpaRepository<SystemNotification, Long> {

    List<SystemNotification> findTop20ByOrderByCreatedAtDesc();

    Page<SystemNotification> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByIsReadFalse();

    @Modifying
    @Transactional
    @Query("UPDATE SystemNotification n SET n.isRead = true, n.readAt = :readAt WHERE n.isRead = false")
    void markAllAsRead(LocalDateTime readAt);
}
