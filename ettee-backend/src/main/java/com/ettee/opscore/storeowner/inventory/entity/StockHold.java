package com.ettee.opscore.storeowner.inventory.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "stock_holds", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class StockHold {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "uuid")
    private UUID id;
    @Column(name = "variant_id", nullable = false, columnDefinition = "uuid")
    private UUID variantId;
    @Column(name = "location_id", nullable = false, columnDefinition = "uuid")
    private UUID locationId;
    @Column(nullable = false)
    private int quantity;
    @Column(name = "order_id", nullable = false, columnDefinition = "uuid")
    private UUID orderId;
    @Column(name = "order_item_id", nullable = false, columnDefinition = "uuid")
    private UUID orderItemId;
    @Column(name = "requested_by", columnDefinition = "uuid")
    private UUID requestedBy;
    @Column(nullable = false, length = 20)
    private String source = "checkout";
    @Column(nullable = false, length = 20)
    private String status = "active";
    @Column(name = "idempotency_key", nullable = false, unique = true, columnDefinition = "text")
    private String idempotencyKey;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "expires_at")
    private Instant expiresAt;
}