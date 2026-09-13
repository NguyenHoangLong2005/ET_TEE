package com.ettee.opscore.identity.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Bảng "users" — dùng chung cho MỌI người dùng trong hệ thống (khách hàng + nhân viên nội bộ).
 * Tên class là AppUser (không đặt "User") để tránh đụng từ khóa/entity mặc định của Spring Security.
 */
@Entity
@Table(name = "users", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class AppUser {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(length = 255)
    private String email;

    @Column(length = 20)
    private String phone;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "full_name", length = 150)
    private String fullName;

    @Column(name = "avatar_url", columnDefinition = "text")
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "account_status")
    private AccountStatus status = AccountStatus.pending_verification;

    @Column(name = "is_staff", nullable = false)
    private boolean isStaff = false;

    @Column(name = "locked_reason", columnDefinition = "text")
    private String lockedReason;

    @Column(name = "locked_by", columnDefinition = "uuid")
    private UUID lockedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
