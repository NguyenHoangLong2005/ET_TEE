package com.nguyenhoanglong.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class UpdateCskhQuotaDto {

    @NotNull(message = "Hạn mức voucher không được để trống")
    private BigDecimal quotaAmount;

    private String period; // YYYY-MM, optional (defaults to current month)

    public UpdateCskhQuotaDto() {}

    public UpdateCskhQuotaDto(BigDecimal quotaAmount, String period) {
        this.quotaAmount = quotaAmount;
        this.period = period;
    }

    public BigDecimal getQuotaAmount() { return quotaAmount; }
    public void setQuotaAmount(BigDecimal quotaAmount) { this.quotaAmount = quotaAmount; }

    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
}
