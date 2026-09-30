package com.nguyenhoanglong.dto;

import java.math.BigDecimal;

public class StaffPerformanceEvaluationCreateDto {
    private String userId;
    private String evaluationPeriod;
    private Integer rating;
    private BigDecimal salesTargetAchievement;
    private String feedbackNotes;

    public StaffPerformanceEvaluationCreateDto() {}

    public StaffPerformanceEvaluationCreateDto(String userId, String evaluationPeriod, Integer rating,
                                                BigDecimal salesTargetAchievement, String feedbackNotes) {
        this.userId = userId;
        this.evaluationPeriod = evaluationPeriod;
        this.rating = rating;
        this.salesTargetAchievement = salesTargetAchievement;
        this.feedbackNotes = feedbackNotes;
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getEvaluationPeriod() { return evaluationPeriod; }
    public void setEvaluationPeriod(String evaluationPeriod) { this.evaluationPeriod = evaluationPeriod; }
    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }
    public BigDecimal getSalesTargetAchievement() { return salesTargetAchievement; }
    public void setSalesTargetAchievement(BigDecimal salesTargetAchievement) { this.salesTargetAchievement = salesTargetAchievement; }
    public String getFeedbackNotes() { return feedbackNotes; }
    public void setFeedbackNotes(String feedbackNotes) { this.feedbackNotes = feedbackNotes; }
}
