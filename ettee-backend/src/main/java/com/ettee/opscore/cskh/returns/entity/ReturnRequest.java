package com.ettee.opscore.cskh.returns.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "return_requests", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class ReturnRequest {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "order_id", nullable = false, columnDefinition = "uuid")
    private UUID orderId;

    @Column(name = "requested_by", columnDefinition = "uuid")
    private UUID requestedBy;

    // 'return_refund' hoặc 'exchange' — theo CHECK constraint của schema (không phải enum Postgres, chỉ là VARCHAR).
    @Column(name = "request_type", nullable = false, length = 20)
    private String requestType;

    @Column(nullable = false, columnDefinition = "text")
    private String reason;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "return_status")
    private ReturnStatus status = ReturnStatus.requested;

    @Column(name = "handled_by", columnDefinition = "uuid")
    private UUID handledBy;

    @Column(name = "replacement_order_id", columnDefinition = "uuid")
    private UUID replacementOrderId;

    @Column(nullable = false)
    @jakarta.persistence.Version
    private long version = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
