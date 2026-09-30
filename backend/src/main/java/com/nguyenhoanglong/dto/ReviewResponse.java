package com.nguyenhoanglong.dto;

import java.time.LocalDateTime;

public class ReviewResponse {
    private Long id;
    private Integer rating;
    private String content;
    private String customerNameSnapshot;
    private String purchasedSize;
    private String purchasedColor;
    private boolean isVerifiedPurchase;
    private LocalDateTime createdAt;
    
    // Status is excluded for public view (since we only show APPROVED anyway), or we can include it.
    private String status;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getCustomerNameSnapshot() { return customerNameSnapshot; }
    public void setCustomerNameSnapshot(String customerNameSnapshot) { this.customerNameSnapshot = customerNameSnapshot; }

    public String getPurchasedSize() { return purchasedSize; }
    public void setPurchasedSize(String purchasedSize) { this.purchasedSize = purchasedSize; }

    public String getPurchasedColor() { return purchasedColor; }
    public void setPurchasedColor(String purchasedColor) { this.purchasedColor = purchasedColor; }

    public boolean isVerifiedPurchase() { return isVerifiedPurchase; }
    public void setVerifiedPurchase(boolean verifiedPurchase) { isVerifiedPurchase = verifiedPurchase; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    private String productSlug;
    private String productName;

    public String getProductSlug() { return productSlug; }
    public void setProductSlug(String productSlug) { this.productSlug = productSlug; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
}
