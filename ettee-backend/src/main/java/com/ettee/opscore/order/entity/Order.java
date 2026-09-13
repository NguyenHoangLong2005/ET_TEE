package com.ettee.opscore.order.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "orders", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class Order {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "order_code", nullable = false, unique = true, length = 30)
    private String orderCode;

    @Column(name = "customer_id", nullable = false, columnDefinition = "uuid")
    private UUID customerId;

    @Column(name = "source_platform", nullable = false, length = 10)
    private String sourcePlatform;

    @Column(name = "customer_name", nullable = false, length = 150)
    private String customerName;

    @Column(name = "customer_phone", nullable = false, length = 20)
    private String customerPhone;

    @Column(name = "customer_email", length = 255)
    private String customerEmail;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "shipping_address", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> shippingAddress;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "order_status")
    private OrderStatus status;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "payment_method", nullable = false, columnDefinition = "payment_method")
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "payment_status", nullable = false, columnDefinition = "payment_status")
    private PaymentStatus paymentStatus;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "discount_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountTotal;

    @Column(name = "shipping_fee", nullable = false, precision = 12, scale = 2)
    private BigDecimal shippingFee;

    @Column(name = "shipping_discount", nullable = false, precision = 12, scale = 2)
    private BigDecimal shippingDiscount;

    // Generated column (STORED) — chỉ đọc, DB tự tính = subtotal - discount_total + shipping_fee - shipping_discount
    @Column(insertable = false, updatable = false, precision = 12, scale = 2)
    private BigDecimal total;

    @Column(nullable = false)
    private Long version;

    @Column(name = "placed_at", nullable = false)
    private Instant placedAt;

    @Column(name = "confirmed_by", columnDefinition = "uuid")
    private UUID confirmedBy;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "cancelled_reason", columnDefinition = "text")
    private String cancelledReason;

    @Column(name = "cancelled_by", columnDefinition = "uuid")
    private UUID cancelledBy;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
