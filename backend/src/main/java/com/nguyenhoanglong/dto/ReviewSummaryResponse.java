package com.nguyenhoanglong.dto;

import java.util.List;
import java.util.Map;

public class ReviewSummaryResponse {
    private List<ReviewResponse> items;
    private Double averageRating;
    private long totalReviews;
    private Map<Integer, Long> ratingSummary;
    private int currentPage;
    private int totalPages;

    public List<ReviewResponse> getItems() { return items; }
    public void setItems(List<ReviewResponse> items) { this.items = items; }

    public Double getAverageRating() { return averageRating; }
    public void setAverageRating(Double averageRating) { this.averageRating = averageRating; }

    public long getTotalReviews() { return totalReviews; }
    public void setTotalReviews(long totalReviews) { this.totalReviews = totalReviews; }

    public Map<Integer, Long> getRatingSummary() { return ratingSummary; }
    public void setRatingSummary(Map<Integer, Long> ratingSummary) { this.ratingSummary = ratingSummary; }

    public int getCurrentPage() { return currentPage; }
    public void setCurrentPage(int currentPage) { this.currentPage = currentPage; }

    public int getTotalPages() { return totalPages; }
    public void setTotalPages(int totalPages) { this.totalPages = totalPages; }
}
