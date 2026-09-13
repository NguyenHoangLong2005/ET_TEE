package com.ettee.opscore.cskh.ticket.entity;

import com.ettee.opscore.storeowner.inventory.entity.ApprovalStatus;
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

/** "Gửi mã hỗ trợ theo hạn mức" — mỗi mã gắn 1 promotion (voucher) dùng riêng cho 1 khách. */
@Entity
@Table(name = "support_codes", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class SupportCode {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "ticket_id", nullable = false, columnDefinition = "uuid")
    private UUID ticketId;

    @Column(name = "promotion_id", nullable = false, unique = true, columnDefinition = "uuid")
    private UUID promotionId;

    @Column(name = "customer_id", nullable = false, columnDefinition = "uuid")
    private UUID customerId;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal value;

    @Column(name = "issued_by", nullable = false, columnDefinition = "uuid")
    private UUID issuedBy;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "approval_status", nullable = false, columnDefinition = "approval_status")
    private ApprovalStatus approvalStatus = ApprovalStatus.pending;

    @Column(name = "approved_by", columnDefinition = "uuid")
    private UUID approvedBy;

    @Column(name = "issued_at", nullable = false, updatable = false)
    private Instant issuedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @PrePersist
    void prePersist() {
        if (issuedAt == null) issuedAt = Instant.now();
    }
}
