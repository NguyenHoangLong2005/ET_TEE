package com.nguyenhoanglong.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "guest_token")
    private String guestToken;

    @Column(name = "order_code", unique = true, nullable = false)
    private String orderCode;

    @Column(name = "voucher_code")
    private String voucherCode;

    @Column(name = "voucher_id")
    private Long voucherId;

    @Column(name = "customer_name", nullable = false)
    private String customerName;

    @Column(name = "customer_phone")
    private String customerPhone;

    @Column(name = "customer_email")
    private String customerEmail;

    @Column(name = "shipping_address_snapshot", columnDefinition = "TEXT")
    private String shippingAddressSnapshot;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(nullable = false)
    private Double subtotal = 0.0;

    @Column(name = "shipping_fee", nullable = false)
    private Double shippingFee = 0.0;

    @Column(name = "discount_total", nullable = false)
    private Double discountTotal = 0.0;

    @Column(name = "shipping_discount")
    private Double shippingDiscount = 0.0;

    @Column(name = "total_amount", nullable = false)
    private Double totalAmount = 0.0;

    @Column(name = "payment_method", nullable = false)
    private String paymentMethod = "COD";

    @Column(name = "payment_status", nullable = false)
    private String paymentStatus = "UNPAID";

    @Column(name = "order_status")
    private String orderStatus = "PENDING_CONFIRMATION";

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private OrderStatus status = OrderStatus.PENDING_CONFIRMATION;

    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    @Column(name = "sla_deadline")
    private LocalDateTime slaDeadline;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Order() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    
    public String getGuestToken() { return guestToken; }
    public void setGuestToken(String guestToken) { this.guestToken = guestToken; }
    
    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }

    public String getVoucherCode() { return voucherCode; }
    public void setVoucherCode(String voucherCode) { this.voucherCode = voucherCode; }

    public Long getVoucherId() { return voucherId; }
    public void setVoucherId(Long voucherId) { this.voucherId = voucherId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }

    public String getPhone() { return customerPhone; }
    public void setPhone(String phone) { this.customerPhone = phone; }

    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }

    public String getShippingAddressSnapshot() { return shippingAddressSnapshot; }
    public void setShippingAddressSnapshot(String shippingAddressSnapshot) { this.shippingAddressSnapshot = shippingAddressSnapshot; }

    public String getShippingAddress() { return shippingAddressSnapshot; }
    public void setShippingAddress(String shippingAddress) { this.shippingAddressSnapshot = shippingAddress; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public Double getSubtotal() { return subtotal; }
    public void setSubtotal(Double subtotal) { this.subtotal = subtotal; }

    public Double getShippingFee() { return shippingFee; }
    public void setShippingFee(Double shippingFee) { this.shippingFee = shippingFee; }

    public Double getDiscountTotal() { return discountTotal; }
    public void setDiscountTotal(Double discountTotal) { this.discountTotal = discountTotal; }

    public Double getShippingDiscount() { return shippingDiscount; }
    public void setShippingDiscount(Double shippingDiscount) { this.shippingDiscount = shippingDiscount; }

    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }

    public Double getTotal() { return totalAmount; }
    public void setTotal(Double total) { this.totalAmount = total; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getOrderStatus() { return orderStatus != null ? orderStatus : (status != null ? status.name() : null); }
    public void setOrderStatus(String orderStatus) { 
        this.orderStatus = orderStatus;
        if (orderStatus != null) {
            try {
                this.status = OrderStatus.valueOf(orderStatus);
            } catch (Exception ignored) {}
        }
    }

    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { 
        this.status = status;
        if (status != null) {
            this.orderStatus = status.name();
        }
    }

    public String getCancelReason() { return cancelReason; }
    public void setCancelReason(String cancelReason) { this.cancelReason = cancelReason; }

    public LocalDateTime getSlaDeadline() { return slaDeadline; }
    public void setSlaDeadline(LocalDateTime slaDeadline) { this.slaDeadline = slaDeadline; }

    public List<OrderItem> getItems() { return items; }
    public void setItems(List<OrderItem> items) { this.items = items; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
