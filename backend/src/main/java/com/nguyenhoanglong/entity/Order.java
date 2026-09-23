package com.nguyenhoanglong.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_id", nullable = false, updatable = false)
    private Long orderId;

    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "order_code", unique = true, length = 30, nullable = false)
    private String orderCode;

    @Column(name = "customer_name", length = 150, nullable = false)
    private String customerName;

    @Column(name = "customer_phone", length = 20, nullable = false)
    private String customerPhone;

    @Column(name = "customer_email", length = 255)
    private String customerEmail;

    @Column(name = "shipping_address", nullable = false)
    private String shippingAddress;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private OrderStatus status = OrderStatus.DRAFT;

    @Column(name = "payment_method", length = 30, nullable = false)
    private String paymentMethod = "cod";

    @Column(name = "payment_status", length = 30, nullable = false)
    private String paymentStatus = "unpaid";

    @Column(name = "subtotal", precision = 15, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "discount_total", precision = 15, scale = 2)
    private BigDecimal discountTotal = BigDecimal.ZERO;

    @Column(name = "shipping_fee", precision = 15, scale = 2)
    private BigDecimal shippingFee = BigDecimal.ZERO;

    @Column(name = "shipping_discount", precision = 15, scale = 2)
    private BigDecimal shippingDiscount = BigDecimal.ZERO;

    @Column(name = "total", precision = 15, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    @Column(name = "sla_deadline")
    private LocalDateTime slaDeadline;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }
    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }
    public String getShippingAddress() { return shippingAddress; }
    public void setShippingAddress(String shippingAddress) { this.shippingAddress = shippingAddress; }
    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public BigDecimal getDiscountTotal() { return discountTotal; }
    public void setDiscountTotal(BigDecimal discountTotal) { this.discountTotal = discountTotal; }
    public BigDecimal getShippingFee() { return shippingFee; }
    public void setShippingFee(BigDecimal shippingFee) { this.shippingFee = shippingFee; }
    public BigDecimal getShippingDiscount() { return shippingDiscount; }
    public void setShippingDiscount(BigDecimal shippingDiscount) { this.shippingDiscount = shippingDiscount; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public String getCancelReason() { return cancelReason; }
    public void setCancelReason(String cancelReason) { this.cancelReason = cancelReason; }
    public LocalDateTime getSlaDeadline() { return slaDeadline; }
    public void setSlaDeadline(LocalDateTime slaDeadline) { this.slaDeadline = slaDeadline; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
