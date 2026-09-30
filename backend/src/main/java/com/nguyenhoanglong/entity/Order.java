package com.nguyenhoanglong.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
<<<<<<< HEAD
import java.util.UUID;
=======
import java.util.List;
>>>>>>> main

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
<<<<<<< HEAD
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
=======
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

    @Column(name = "shop_id")
    private Long shopId;

    @Column(name = "customer_name", nullable = false)
    private String customerName;

    public Long getShopId() { return shopId; }
    public void setShopId(Long shopId) { this.shopId = shopId; }

    @Column(name = "customer_phone")
    private String customerPhone;

    @Column(name = "customer_email")
    private String customerEmail;

    @Column(name = "shipping_address_snapshot", columnDefinition = "TEXT")
    private String shippingAddressSnapshot;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(nullable = false, columnDefinition = "double precision default 0")
    private Double subtotal = 0.0;

    @Column(name = "shipping_fee", nullable = false, columnDefinition = "double precision default 0")
    private Double shippingFee = 0.0;

    @Column(name = "discount_total", nullable = false, columnDefinition = "double precision default 0")
    private Double discountTotal = 0.0;

    @Transient
    private Double shippingDiscount = 0.0;

    @Column(name = "total_amount", nullable = false, columnDefinition = "double precision default 0")
    private Double totalAmount = 0.0;

    @Column(name = "payment_method", nullable = false, columnDefinition = "varchar(50) default 'COD'")
    private String paymentMethod = "COD";

    @Column(name = "payment_status", nullable = false, columnDefinition = "varchar(50) default 'UNPAID'")
    private String paymentStatus = "UNPAID";

    @Column(name = "order_status", columnDefinition = "varchar(50) default 'PENDING_CONFIRMATION'")
    private String orderStatus = "PENDING_CONFIRMATION";
>>>>>>> main

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private OrderStatus status = OrderStatus.PENDING_CONFIRMATION;

<<<<<<< HEAD
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
=======
    /**
     * Da cong so luong cua don nay vao Product.soldCount hay chua.
     * Co nay lam cho viec cong/tru tro nen idempotent: cap nhat trang thai lap lai,
     * webhook goi hai lan, hay duong di DELIVERED -> REFUNDED (khong qua RETURNED)
     * deu chi tac dong dung mot lan. Xem SoldCountService.
     */
    @Column(name = "sold_counted", nullable = false, columnDefinition = "boolean default false")
    private boolean soldCounted = false;
>>>>>>> main

    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    @Column(name = "sla_deadline")
    private LocalDateTime slaDeadline;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

<<<<<<< HEAD
    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
=======
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
    
>>>>>>> main
    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }

    public String getVoucherCode() { return voucherCode; }
    public void setVoucherCode(String voucherCode) { this.voucherCode = voucherCode; }

    public Long getVoucherId() { return voucherId; }
    public void setVoucherId(Long voucherId) { this.voucherId = voucherId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
<<<<<<< HEAD
    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }
    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }
    public String getShippingAddress() { return shippingAddress; }
    public void setShippingAddress(String shippingAddress) { this.shippingAddress = shippingAddress; }
    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }
=======

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

>>>>>>> main
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

    public boolean isSoldCounted() { return soldCounted; }
    public void setSoldCounted(boolean soldCounted) { this.soldCounted = soldCounted; }

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
