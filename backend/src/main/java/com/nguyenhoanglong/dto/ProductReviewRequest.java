package com.nguyenhoanglong.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class ProductReviewRequest {
    private String productSlug;
    private Integer rating;
    private String content;
    private String purchasedSize;
    private String purchasedColor;

    public ProductReviewRequest() {}

    public ProductReviewRequest(String productSlug, Integer rating, String content, String purchasedSize, String purchasedColor) {
        this.productSlug = productSlug;
        this.rating = rating;
        this.content = content;
        this.purchasedSize = purchasedSize;
        this.purchasedColor = purchasedColor;
    }

    public String getProductSlug() { return productSlug; }
    public void setProductSlug(String productSlug) { this.productSlug = productSlug; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getPurchasedSize() { return purchasedSize; }
    public void setPurchasedSize(String purchasedSize) { this.purchasedSize = purchasedSize; }

    public String getPurchasedColor() { return purchasedColor; }
    public void setPurchasedColor(String purchasedColor) { this.purchasedColor = purchasedColor; }
}
