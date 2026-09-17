package com.ettee.opscore.order.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "order_items", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class OrderItem {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "order_id", nullable = false, columnDefinition = "uuid")
    private UUID orderId;

    @Column(name = "variant_id", nullable = false, columnDefinition = "uuid")
    private UUID variantId;

    @Column(name = "product_name_snapshot", nullable = false, length = 255)
    private String productNameSnapshot;

    @Column(name = "sku_snapshot", nullable = false, length = 60)
    private String skuSnapshot;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "variant_snapshot", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> variantSnapshot;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "discount_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountAmount;

    @Column(insertable = false, updatable = false, precision = 12, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "line_total", insertable = false, updatable = false, precision = 12, scale = 2)
    private BigDecimal lineTotal;
}
