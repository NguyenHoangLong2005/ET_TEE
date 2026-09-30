package com.nguyenhoanglong.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class CodReconciliationDto {
    private Long id;
    private String reconciliationCode;
    private Long shopId;
    private BigDecimal totalCodAmount;
    private Integer itemCount;
    private String reconciledBy;
    private String reconciledByName;
    private LocalDateTime reconciledAt;
    private String note;
    private String status;
    private LocalDateTime createdAt;
    private List<CodReconciliationItemDto> items;

    public CodReconciliationDto() {}

    public CodReconciliationDto(Long id, String reconciliationCode, Long shopId, BigDecimal totalCodAmount, Integer itemCount, String reconciledBy, String reconciledByName, LocalDateTime reconciledAt, String note, String status, LocalDateTime createdAt, List<CodReconciliationItemDto> items) {
        this.id = id;
        this.reconciliationCode = reconciliationCode;
        this.shopId = shopId;
        this.totalCodAmount = totalCodAmount;
        this.itemCount = itemCount;
        this.reconciledBy = reconciledBy;
        this.reconciledByName = reconciledByName;
        this.reconciledAt = reconciledAt;
        this.note = note;
        this.status = status;
        this.createdAt = createdAt;
        this.items = items;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getReconciliationCode() { return reconciliationCode; }
    public void setReconciliationCode(String reconciliationCode) { this.reconciliationCode = reconciliationCode; }
    public Long getShopId() { return shopId; }
    public void setShopId(Long shopId) { this.shopId = shopId; }
    public BigDecimal getTotalCodAmount() { return totalCodAmount; }
    public void setTotalCodAmount(BigDecimal totalCodAmount) { this.totalCodAmount = totalCodAmount; }
    public Integer getItemCount() { return itemCount; }
    public void setItemCount(Integer itemCount) { this.itemCount = itemCount; }
    public String getReconciledBy() { return reconciledBy; }
    public void setReconciledBy(String reconciledBy) { this.reconciledBy = reconciledBy; }
    public String getReconciledByName() { return reconciledByName; }
    public void setReconciledByName(String reconciledByName) { this.reconciledByName = reconciledByName; }
    public LocalDateTime getReconciledAt() { return reconciledAt; }
    public void setReconciledAt(LocalDateTime reconciledAt) { this.reconciledAt = reconciledAt; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public List<CodReconciliationItemDto> getItems() { return items; }
    public void setItems(List<CodReconciliationItemDto> items) { this.items = items; }
}
