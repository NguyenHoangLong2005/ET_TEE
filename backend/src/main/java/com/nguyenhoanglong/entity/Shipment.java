package com.nguyenhoanglong.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "shipments")
public class Shipment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "shipment_id")
    private Long id;

    @OneToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Order order;

    @Column(name = "carrier_name", nullable = false, length = 150)
    private String carrierName;

    @Column(name = "tracking_code", unique = true, length = 100)
    private String trackingCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ShipmentStatus status = ShipmentStatus.PENDING;

    @Column(name = "handover_at")
    private LocalDateTime handoverAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "delivery_proof_url", length = 1000)
    private String deliveryProofUrl;

    @Column(name = "cod_amount", precision = 15, scale = 2)
    private BigDecimal codAmount = BigDecimal.ZERO;

    @Column(name = "cod_reconciled", nullable = false)
    private Boolean codReconciled = false;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
    public String getCarrierName() { return carrierName; }
    public void setCarrierName(String carrierName) { this.carrierName = carrierName; }
    public String getTrackingCode() { return trackingCode; }
    public void setTrackingCode(String trackingCode) { this.trackingCode = trackingCode; }
    public ShipmentStatus getStatus() { return status; }
    public void setStatus(ShipmentStatus status) { this.status = status; }
    public LocalDateTime getHandoverAt() { return handoverAt; }
    public void setHandoverAt(LocalDateTime handoverAt) { this.handoverAt = handoverAt; }
    public LocalDateTime getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(LocalDateTime deliveredAt) { this.deliveredAt = deliveredAt; }
    public String getDeliveryProofUrl() { return deliveryProofUrl; }
    public void setDeliveryProofUrl(String deliveryProofUrl) { this.deliveryProofUrl = deliveryProofUrl; }
    public BigDecimal getCodAmount() { return codAmount; }
    public void setCodAmount(BigDecimal codAmount) { this.codAmount = codAmount; }
    public Boolean getCodReconciled() { return codReconciled; }
    public void setCodReconciled(Boolean codReconciled) { this.codReconciled = codReconciled; }
}
