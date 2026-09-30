package com.nguyenhoanglong.dto;

import jakarta.validation.constraints.NotNull;

public class LinkOrderTicketDto {

    @NotNull(message = "ID đơn hàng không được để trống")
    private Long orderId;

    public LinkOrderTicketDto() {}

    public LinkOrderTicketDto(Long orderId) {
        this.orderId = orderId;
    }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
}
