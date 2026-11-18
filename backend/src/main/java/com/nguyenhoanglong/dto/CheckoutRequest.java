package com.nguyenhoanglong.dto;

public class CheckoutRequest {
    private String shippingAddress;
    private String shippingMethod;
    private String paymentMethod;
    private String note;
    private String voucherCode;
    
    private String customerName;
    private String customerEmail;
    private String customerPhone;

    /**
     * Cart lines (CartItem ids) the customer ticked on the cart page. Null or empty means the
     * whole cart, which is what older clients (the mobile app) send. Lines left out stay in the cart.
     */
    private java.util.List<Long> cartItemIds;

    public java.util.List<Long> getCartItemIds() { return cartItemIds; }
    public void setCartItemIds(java.util.List<Long> cartItemIds) { this.cartItemIds = cartItemIds; }

    public String getShippingAddress() { return shippingAddress; }
    public void setShippingAddress(String shippingAddress) { this.shippingAddress = shippingAddress; }

    public String getShippingMethod() { return shippingMethod; }
    public void setShippingMethod(String shippingMethod) { this.shippingMethod = shippingMethod; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public String getVoucherCode() { return voucherCode; }
    public void setVoucherCode(String voucherCode) { this.voucherCode = voucherCode; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }

    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }
}
