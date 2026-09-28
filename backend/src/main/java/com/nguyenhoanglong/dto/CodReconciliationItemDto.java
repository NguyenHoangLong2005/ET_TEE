package com.nguyenhoanglong.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CodReconciliationItemDto {
    private Long id;
    private Long shipmentId;
    private String trackingCode;
    private String orderCode;
    private String customerName;
    private BigDecimal codAmount;
    private LocalDateTime createdAt;

    public CodReconciliationItemDto() {}

    public CodReconciliationItemDto(Long id, Long shipmentId, String trackingCode, String orderCode, String customerName, BigDecimal codAmount, LocalDateTime createdAt) {
        this.id = id;
        this.shipmentId = shipmentId;
        this.trackingCode = trackingCode;
        this.orderCode = orderCode;
        this.customerName = customerName;
        this.codAmount = codAmount;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getShipmentId() { return shipmentId; }
    public void setShipmentId(Long shipmentId) { this.shipmentId = shipmentId; }
    public String getTrackingCode() { return trackingCode; }
    public void setTrackingCode(String trackingCode) { this.trackingCode = trackingCode; }
    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public BigDecimal getCodAmount() { return codAmount; }
    public void setCodAmount(BigDecimal codAmount) { this.codAmount = codAmount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
