package com.nguyenhoanglong.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CskhVoucherGrantDto {
    private Long grantId;
    private String voucherCode;
    private BigDecimal amount;
    private String ticketId;
    private String customerId;
    private BigDecimal remainingQuota;
    private LocalDateTime expiryDate;

    public CskhVoucherGrantDto() {}

    public CskhVoucherGrantDto(Long grantId, String voucherCode, BigDecimal amount, String ticketId, String customerId, BigDecimal remainingQuota, LocalDateTime expiryDate) {
        this.grantId = grantId;
        this.voucherCode = voucherCode;
        this.amount = amount;
        this.ticketId = ticketId;
        this.customerId = customerId;
        this.remainingQuota = remainingQuota;
        this.expiryDate = expiryDate;
    }

    public Long getGrantId() { return grantId; }
    public void setGrantId(Long grantId) { this.grantId = grantId; }

    public String getVoucherCode() { return voucherCode; }
    public void setVoucherCode(String voucherCode) { this.voucherCode = voucherCode; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getTicketId() { return ticketId; }
    public void setTicketId(String ticketId) { this.ticketId = ticketId; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public BigDecimal getRemainingQuota() { return remainingQuota; }
    public void setRemainingQuota(BigDecimal remainingQuota) { this.remainingQuota = remainingQuota; }

    public LocalDateTime getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDateTime expiryDate) { this.expiryDate = expiryDate; }
}
