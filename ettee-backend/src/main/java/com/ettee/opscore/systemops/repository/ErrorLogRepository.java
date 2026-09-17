package com.ettee.opscore.systemops.repository;

import com.ettee.opscore.systemops.entity.ErrorLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ErrorLogRepository extends JpaRepository<ErrorLog, Long> {
    Page<ErrorLog> findAllByOrderByOccurredAtDesc(Pageable pageable);
    Page<ErrorLog> findByResolvedOrderByOccurredAtDesc(boolean resolved, Pageable pageable);
}
