package com.nguyenhoanglong.dto;

import java.math.BigDecimal;

public class CskhQuotaStatusDto {
    private String staffId;
    private Long shopId;
    private String period;
    private BigDecimal quotaAmount;
    private BigDecimal usedAmount;
    private BigDecimal remainingQuota;

    public CskhQuotaStatusDto() {}

    public CskhQuotaStatusDto(String staffId, Long shopId, String period, BigDecimal quotaAmount, BigDecimal usedAmount, BigDecimal remainingQuota) {
        this.staffId = staffId;
        this.shopId = shopId;
        this.period = period;
        this.quotaAmount = quotaAmount;
        this.usedAmount = usedAmount;
        this.remainingQuota = remainingQuota;
    }

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

    public BigDecimal getRemainingQuota() { return remainingQuota; }
    public void setRemainingQuota(BigDecimal remainingQuota) { this.remainingQuota = remainingQuota; }
}
