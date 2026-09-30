package com.nguyenhoanglong.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "cod_reconciliations")
public class CodReconciliation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reconciliation_id")
    private Long id;

    @Column(name = "reconciliation_code", nullable = false, unique = true, length = 50)
    private String reconciliationCode;

    @Column(name = "shop_id")
    private Long shopId;

    @Column(name = "total_cod_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalCodAmount = BigDecimal.ZERO;

    @Column(name = "item_count", nullable = false)
    private Integer itemCount = 0;

    @Column(name = "reconciled_by", nullable = false, length = 100)
    private String reconciledBy;

    @Column(name = "reconciled_by_name", length = 150)
    private String reconciledByName;

    @Column(name = "reconciled_at", nullable = false)
    private LocalDateTime reconciledAt;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "COMPLETED";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "reconciliation", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CodReconciliationItem> items = new ArrayList<>();

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
    public List<CodReconciliationItem> getItems() { return items; }
    public void setItems(List<CodReconciliationItem> items) { this.items = items; }
}
