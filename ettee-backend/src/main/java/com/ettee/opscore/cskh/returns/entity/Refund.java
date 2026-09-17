package com.ettee.opscore.cskh.returns.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refunds", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class Refund {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "return_request_id", columnDefinition = "uuid")
    private UUID returnRequestId;

    @Column(name = "order_id", nullable = false, columnDefinition = "uuid")
    private UUID orderId;

    @Column(name = "payment_id", nullable = false, columnDefinition = "uuid")
    private UUID paymentId;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "payment_method")
    private com.ettee.opscore.order.entity.PaymentMethod method;

    // pending | success | failed | cancelled — VARCHAR + CHECK trong schema, không phải enum Postgres.
    @Column(nullable = false, length = 20)
    private String status = "pending";

    @Column(name = "idempotency_key", nullable = false, unique = true)
    private String idempotencyKey;

    @Column(name = "provider_ref", length = 150)
    private String providerRef;

    @Column(name = "processed_by", columnDefinition = "uuid")
    private UUID processedBy;

    @Column(name = "processed_at")
    private Instant processedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
        if (idempotencyKey == null) idempotencyKey = UUID.randomUUID().toString();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
