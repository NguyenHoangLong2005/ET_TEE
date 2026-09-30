package com.nguyenhoanglong.dto;

import java.time.LocalDateTime;
import java.util.List;

public class RestrictedOrderLookupDto {
    private Long orderId;
    private String orderCode;
    private String maskedCustomerName;
    private String maskedCustomerPhone;
    private String maskedShippingAddress;
    private String orderStatus;
    private String paymentMethod;
    private String paymentStatus;
    private Double totalAmount;
    private LocalDateTime estimatedDelivery;
    private Long shopId;
    private List<OrderItemLookupDto> items;

    public RestrictedOrderLookupDto() {}

    public RestrictedOrderLookupDto(Long orderId, String orderCode, String maskedCustomerName, String maskedCustomerPhone, String maskedShippingAddress, String orderStatus, String paymentMethod, String paymentStatus, Double totalAmount, LocalDateTime estimatedDelivery, Long shopId, List<OrderItemLookupDto> items) {
        this.orderId = orderId;
        this.orderCode = orderCode;
        this.maskedCustomerName = maskedCustomerName;
        this.maskedCustomerPhone = maskedCustomerPhone;
        this.maskedShippingAddress = maskedShippingAddress;
        this.orderStatus = orderStatus;
        this.paymentMethod = paymentMethod;
        this.paymentStatus = paymentStatus;
        this.totalAmount = totalAmount;
        this.estimatedDelivery = estimatedDelivery;
        this.shopId = shopId;
        this.items = items;
    }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }

    public String getMaskedCustomerName() { return maskedCustomerName; }
    public void setMaskedCustomerName(String maskedCustomerName) { this.maskedCustomerName = maskedCustomerName; }

    public String getMaskedCustomerPhone() { return maskedCustomerPhone; }
    public void setMaskedCustomerPhone(String maskedCustomerPhone) { this.maskedCustomerPhone = maskedCustomerPhone; }

    public String getMaskedShippingAddress() { return maskedShippingAddress; }
    public void setMaskedShippingAddress(String maskedShippingAddress) { this.maskedShippingAddress = maskedShippingAddress; }

    public String getOrderStatus() { return orderStatus; }
    public void setOrderStatus(String orderStatus) { this.orderStatus = orderStatus; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }

    public LocalDateTime getEstimatedDelivery() { return estimatedDelivery; }
    public void setEstimatedDelivery(LocalDateTime estimatedDelivery) { this.estimatedDelivery = estimatedDelivery; }

    public Long getShopId() { return shopId; }
    public void setShopId(Long shopId) { this.shopId = shopId; }

    public List<OrderItemLookupDto> getItems() { return items; }
    public void setItems(List<OrderItemLookupDto> items) { this.items = items; }
}
