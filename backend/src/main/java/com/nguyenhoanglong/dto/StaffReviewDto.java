package com.nguyenhoanglong.dto;

import java.time.LocalDateTime;

public class StaffReviewDto {
    private Long id;
    private String productSlug;
    private String productName;
    private String customerName;
    private Integer rating;
    private String content;
    private String purchasedSize;
    private String purchasedColor;
    private boolean verifiedPurchase;
    private LocalDateTime createdAt;
    private String status; // PENDING_REPLY | REPLIED | HIDDEN
    private ReplyDto reply;

    public static class ReplyDto {
        private Long id;
        private String replyMessage;
        private String repliedBy;
        private LocalDateTime repliedAt;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getReplyMessage() { return replyMessage; }
        public void setReplyMessage(String replyMessage) { this.replyMessage = replyMessage; }
        public String getRepliedBy() { return repliedBy; }
        public void setRepliedBy(String repliedBy) { this.repliedBy = repliedBy; }
        public LocalDateTime getRepliedAt() { return repliedAt; }
        public void setRepliedAt(LocalDateTime repliedAt) { this.repliedAt = repliedAt; }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getProductSlug() { return productSlug; }
    public void setProductSlug(String productSlug) { this.productSlug = productSlug; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
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
    public boolean isVerifiedPurchase() { return verifiedPurchase; }
    public void setVerifiedPurchase(boolean verifiedPurchase) { this.verifiedPurchase = verifiedPurchase; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public ReplyDto getReply() { return reply; }
    public void setReply(ReplyDto reply) { this.reply = reply; }
}
