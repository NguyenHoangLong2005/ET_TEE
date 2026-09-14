package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, String> {
    Optional<PasswordResetToken> findByUserIdAndStatus(String userId, String status);
    List<PasswordResetToken> findAllByUserIdAndStatus(String userId, String status);
    
    // To check if a token was created recently for cooldown
    Optional<PasswordResetToken> findFirstByUserIdOrderByCreatedAtDesc(String userId);
}
