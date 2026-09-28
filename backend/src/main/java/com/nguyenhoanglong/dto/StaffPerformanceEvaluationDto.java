package com.nguyenhoanglong.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class StaffPerformanceEvaluationDto {
    private Long id;
    private Long shopId;
    private String userId;
    private String userFullName;
    private String evaluationPeriod;
    private Integer rating;
    private BigDecimal salesTargetAchievement;
    private String feedbackNotes;
    private String evaluatedBy;
    private LocalDateTime createdAt;

    public StaffPerformanceEvaluationDto() {}

    public StaffPerformanceEvaluationDto(Long id, Long shopId, String userId, String userFullName,
                                         String evaluationPeriod, Integer rating, BigDecimal salesTargetAchievement,
                                         String feedbackNotes, String evaluatedBy, LocalDateTime createdAt) {
        this.id = id;
        this.shopId = shopId;
        this.userId = userId;
        this.userFullName = userFullName;
        this.evaluationPeriod = evaluationPeriod;
        this.rating = rating;
        this.salesTargetAchievement = salesTargetAchievement;
        this.feedbackNotes = feedbackNotes;
        this.evaluatedBy = evaluatedBy;
        this.createdAt = createdAt;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private Long shopId;
        private String userId;
        private String userFullName;
        private String evaluationPeriod;
        private Integer rating;
        private BigDecimal salesTargetAchievement;
        private String feedbackNotes;
        private String evaluatedBy;
        private LocalDateTime createdAt;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder shopId(Long shopId) { this.shopId = shopId; return this; }
        public Builder userId(String userId) { this.userId = userId; return this; }
        public Builder userFullName(String userFullName) { this.userFullName = userFullName; return this; }
        public Builder evaluationPeriod(String evaluationPeriod) { this.evaluationPeriod = evaluationPeriod; return this; }
        public Builder rating(Integer rating) { this.rating = rating; return this; }
        public Builder salesTargetAchievement(BigDecimal salesTargetAchievement) { this.salesTargetAchievement = salesTargetAchievement; return this; }
        public Builder feedbackNotes(String feedbackNotes) { this.feedbackNotes = feedbackNotes; return this; }
        public Builder evaluatedBy(String evaluatedBy) { this.evaluatedBy = evaluatedBy; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }

        public StaffPerformanceEvaluationDto build() {
            return new StaffPerformanceEvaluationDto(id, shopId, userId, userFullName, evaluationPeriod, rating, salesTargetAchievement, feedbackNotes, evaluatedBy, createdAt);
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getShopId() { return shopId; }
    public void setShopId(Long shopId) { this.shopId = shopId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getUserFullName() { return userFullName; }
    public void setUserFullName(String userFullName) { this.userFullName = userFullName; }
    public String getEvaluationPeriod() { return evaluationPeriod; }
    public void setEvaluationPeriod(String evaluationPeriod) { this.evaluationPeriod = evaluationPeriod; }
    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }
    public BigDecimal getSalesTargetAchievement() { return salesTargetAchievement; }
    public void setSalesTargetAchievement(BigDecimal salesTargetAchievement) { this.salesTargetAchievement = salesTargetAchievement; }
    public String getFeedbackNotes() { return feedbackNotes; }
    public void setFeedbackNotes(String feedbackNotes) { this.feedbackNotes = feedbackNotes; }
    public String getEvaluatedBy() { return evaluatedBy; }
    public void setEvaluatedBy(String evaluatedBy) { this.evaluatedBy = evaluatedBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
