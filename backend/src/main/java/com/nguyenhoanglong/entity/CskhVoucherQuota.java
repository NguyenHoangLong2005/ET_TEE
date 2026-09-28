package com.nguyenhoanglong.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cskh_voucher_quotas", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"staff_id", "period"})
})
public class CskhVoucherQuota {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "staff_id", nullable = false)
    private String staffId;

    @Column(name = "shop_id")
    private Long shopId;

    @Column(name = "period", nullable = false, length = 7)
    private String period; // YYYY-MM

    @Column(name = "quota_amount", nullable = false)
    private BigDecimal quotaAmount = new BigDecimal("2000000.00");

    @Column(name = "used_amount", nullable = false)
    private BigDecimal usedAmount = BigDecimal.ZERO;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public CskhVoucherQuota() {}

    public CskhVoucherQuota(String staffId, Long shopId, String period, BigDecimal quotaAmount, BigDecimal usedAmount) {
        this.staffId = staffId;
        this.shopId = shopId;
        this.period = period;
        this.quotaAmount = quotaAmount;
        this.usedAmount = usedAmount;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getStaffId() { return staffId; }
    public void setStaffId(String staffId) { this.staffId = staffId; }

    public Long getShopId() { return shopId; }
    public void setShopId(Long shopId) { this.shopId = shopId; }

    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }

    public BigDecimal getQuotaAmount() { return quotaAmount; }
    public void setQuotaAmount(BigDecimal quotaAmount) { this.quotaAmount = quotaAmount; }

    public BigDecimal getUsedAmount() { return usedAmount; }
    public void setUsedAmount(BigDecimal usedAmount) { this.usedAmount = usedAmount; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
