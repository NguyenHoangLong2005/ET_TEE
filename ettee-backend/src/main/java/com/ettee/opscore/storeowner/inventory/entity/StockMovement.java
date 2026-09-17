package com.ettee.opscore.storeowner.inventory.entity;

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
 * Lịch sử xuất/nhập/điều chỉnh kho — BẤT BIẾN (có trigger DB chặn UPDATE/DELETE: protect_movements).
 * Mỗi lần thay đổi inventory.quantity_on_hand/reserved PHẢI đi kèm 1 dòng ở đây trong CÙNG transaction.
 */
@Entity
@Table(name = "stock_movements", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class StockMovement {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "variant_id", nullable = false, columnDefinition = "uuid")
    private UUID variantId;

    @Column(name = "location_id", nullable = false, columnDefinition = "uuid")
    private UUID locationId;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "movement_type", nullable = false, columnDefinition = "movement_type")
    private MovementType movementType;

    @Column(name = "on_hand_delta", nullable = false)
    private int onHandDelta = 0;

    @Column(name = "reserved_delta", nullable = false)
    private int reservedDelta = 0;

    @Column(name = "reference_type", nullable = false, length = 50)
    private String referenceType;

    @Column(name = "reference_id", nullable = false, columnDefinition = "uuid")
    private UUID referenceId;

    @Column(name = "idempotency_key", nullable = false, unique = true)
    private String idempotencyKey;

    @Column(name = "created_by", columnDefinition = "uuid")
    private UUID createdBy;

    @Column(columnDefinition = "text")
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (idempotencyKey == null) idempotencyKey = UUID.randomUUID().toString();
    }
}
