package com.nguyenhoanglong.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "shipping_exceptions")
public class ShippingException {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "exception_id", nullable = false, updatable = false)
    private Long exceptionId;

    @Column(name = "shipment_id", nullable = false)
    private Long shipmentId;

    @Column(name = "exception_type", nullable = false, length = 100)
    private String exceptionType;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "resolution_note", columnDefinition = "TEXT")
    private String resolutionNote;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "OPEN";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getExceptionId() { return exceptionId; }
    public void setExceptionId(Long exceptionId) { this.exceptionId = exceptionId; }
    public Long getShipmentId() { return shipmentId; }
    public void setShipmentId(Long shipmentId) { this.shipmentId = shipmentId; }
    public String getExceptionType() { return exceptionType; }
    public void setExceptionType(String exceptionType) { this.exceptionType = exceptionType; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getResolutionNote() { return resolutionNote; }
    public void setResolutionNote(String resolutionNote) { this.resolutionNote = resolutionNote; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
