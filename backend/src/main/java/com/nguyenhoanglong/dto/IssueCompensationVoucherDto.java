package com.nguyenhoanglong.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class IssueCompensationVoucherDto {

    @NotBlank(message = "ID ticket hỗ trợ không được để trống")
    private String ticketId;

    @NotNull(message = "Số tiền voucher không được để trống")
    private BigDecimal amount;

    private String reason;

    public IssueCompensationVoucherDto() {}

    public IssueCompensationVoucherDto(String ticketId, BigDecimal amount, String reason) {
        this.ticketId = ticketId;
        this.amount = amount;
        this.reason = reason;
    }

    public String getTicketId() { return ticketId; }
    public void setTicketId(String ticketId) { this.ticketId = ticketId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
