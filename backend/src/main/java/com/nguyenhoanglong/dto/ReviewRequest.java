package com.nguyenhoanglong.dto;

public class ReviewRequest {
    private Long orderItemId;
    private Integer rating;
    private String content;
    
    // For Guest Reviews
    private String orderCode;
    private String customerEmailOrPhone;

    public Long getOrderItemId() { return orderItemId; }
    public void setOrderItemId(Long orderItemId) { this.orderItemId = orderItemId; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    
    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }
    
    public String getCustomerEmailOrPhone() { return customerEmailOrPhone; }
    public void setCustomerEmailOrPhone(String customerEmailOrPhone) { this.customerEmailOrPhone = customerEmailOrPhone; }
}
