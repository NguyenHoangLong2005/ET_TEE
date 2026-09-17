package com.ettee.opscore.order.dto;

import com.ettee.opscore.order.entity.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;

public record CheckoutRequest(
        @NotBlank(message = "Vui lòng nhập họ tên khách hàng") String customerName,
        @NotBlank(message = "Vui lòng nhập số điện thoại") String customerPhone,
        String customerEmail,
        @NotNull(message = "Thiếu thông tin địa chỉ giao hàng") Map<String, Object> shippingAddress,
        @NotNull(message = "Vui lòng chọn phương thức thanh toán") PaymentMethod paymentMethod,
        @NotEmpty(message = "Giỏ hàng không được trống") List<@Valid CheckoutItemsRequest> items) {
}
