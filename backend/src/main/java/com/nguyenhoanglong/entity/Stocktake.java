package com.nguyenhoanglong.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "stocktakes")
public class Stocktake {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "stocktake_id", nullable = false, updatable = false)
    private Long stocktakeId;

    @Column(name = "warehouse_location", nullable = false, length = 100)
    private String warehouseLocation;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "actual_quantity")
    private Integer actualQuantity;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "OPEN";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getStocktakeId() { return stocktakeId; }
    public void setStocktakeId(Long stocktakeId) { this.stocktakeId = stocktakeId; }
    public String getWarehouseLocation() { return warehouseLocation; }
    public void setWarehouseLocation(String warehouseLocation) { this.warehouseLocation = warehouseLocation; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
    public Integer getActualQuantity() { return actualQuantity; }
    public void setActualQuantity(Integer actualQuantity) { this.actualQuantity = actualQuantity; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
