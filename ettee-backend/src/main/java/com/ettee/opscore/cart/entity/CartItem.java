package com.ettee.opscore.cart.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "cart_items", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class CartItem {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "uuid")
    private UUID id;
    @Column(name = "cart_id", nullable = false, columnDefinition = "uuid")
    private UUID cartId;
    @Column(name = "variant_id", nullable = false, columnDefinition = "uuid")
    private UUID variantId;
    @Column(nullable = false)
    private int quantity;
    @Column(name = "price_at_add", nullable = false, precision = 12, scale = 2)
    private BigDecimal priceAtAdd;
    @Column(name = "added_at", nullable = false)
    private Instant addedAt;
}