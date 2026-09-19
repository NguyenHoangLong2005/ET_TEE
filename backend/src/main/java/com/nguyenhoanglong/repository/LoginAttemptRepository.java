package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.LoginAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Repository
public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, String> {
    
    @Modifying
    @Transactional
    @Query("DELETE FROM LoginAttempt l WHERE l.attemptedAt < :thresholdDate")
    void deleteOldAttempts(LocalDateTime thresholdDate);
}
