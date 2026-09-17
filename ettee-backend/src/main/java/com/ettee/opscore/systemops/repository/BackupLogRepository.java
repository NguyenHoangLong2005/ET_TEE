package com.ettee.opscore.systemops.repository;

import com.ettee.opscore.systemops.entity.BackupLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BackupLogRepository extends JpaRepository<BackupLog, UUID> {
    Page<BackupLog> findAllByOrderByStartedAtDesc(Pageable pageable);
}
