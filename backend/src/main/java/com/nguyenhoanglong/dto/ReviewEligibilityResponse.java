package com.nguyenhoanglong.dto;

public class ReviewEligibilityResponse {
    private boolean canReview;
    private String reason;
    private Long orderItemId;
    private String purchasedSize;
    private String purchasedColor;

    public boolean isCanReview() { return canReview; }
    public void setCanReview(boolean canReview) { this.canReview = canReview; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public Long getOrderItemId() { return orderItemId; }
    public void setOrderItemId(Long orderItemId) { this.orderItemId = orderItemId; }

    public String getPurchasedSize() { return purchasedSize; }
    public void setPurchasedSize(String purchasedSize) { this.purchasedSize = purchasedSize; }

    public String getPurchasedColor() { return purchasedColor; }
    public void setPurchasedColor(String purchasedColor) { this.purchasedColor = purchasedColor; }
}
