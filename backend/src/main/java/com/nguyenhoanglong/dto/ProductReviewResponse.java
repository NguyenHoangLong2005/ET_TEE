package com.nguyenhoanglong.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

public class ProductReviewResponse {
    private Long id;
    private String customerName;
    private Integer rating;
    private String content;
    private String purchasedSize;
    private String purchasedColor;
    private boolean isVerifiedPurchase;
    private LocalDateTime createdAt;

    public ProductReviewResponse() {}

    public ProductReviewResponse(Long id, String customerName, Integer rating, String content, String purchasedSize, String purchasedColor, boolean isVerifiedPurchase, LocalDateTime createdAt) {
        this.id = id;
        this.customerName = customerName;
        this.rating = rating;
        this.content = content;
        this.purchasedSize = purchasedSize;
        this.purchasedColor = purchasedColor;
        this.isVerifiedPurchase = isVerifiedPurchase;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getPurchasedSize() { return purchasedSize; }
    public void setPurchasedSize(String purchasedSize) { this.purchasedSize = purchasedSize; }

    public String getPurchasedColor() { return purchasedColor; }
    public void setPurchasedColor(String purchasedColor) { this.purchasedColor = purchasedColor; }

    public boolean isVerifiedPurchase() { return isVerifiedPurchase; }
    public void setVerifiedPurchase(boolean verifiedPurchase) { isVerifiedPurchase = verifiedPurchase; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
