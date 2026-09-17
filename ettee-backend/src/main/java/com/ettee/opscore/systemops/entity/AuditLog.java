package com.ettee.opscore.systemops.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Bảng audit_logs. Ghi chú: cột ip_address (kiểu INET của Postgres) không map ở entity này
 * để tránh phức tạp hóa driver type — nếu cần hiển thị IP, lấy qua native query CAST(ip_address AS TEXT).
 */
@Entity
@Table(name = "audit_logs", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class AuditLog {

    @Id
    private Long id;

    @Column(name = "actor_user_id", columnDefinition = "uuid")
    private UUID actorUserId;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType;

    @Column(name = "entity_id", columnDefinition = "uuid")
    private UUID entityId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "old_value", columnDefinition = "jsonb")
    private String oldValue;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "new_value", columnDefinition = "jsonb")
    private String newValue;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
