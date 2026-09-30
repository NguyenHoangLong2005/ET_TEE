package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.ReviewEligibilityResponse;
import com.nguyenhoanglong.dto.ReviewRequest;
import com.nguyenhoanglong.dto.ReviewResponse;
import com.nguyenhoanglong.dto.ReviewSummaryResponse;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.service.ReviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/products/{slug}/reviews")
public class ReviewController {

    @Autowired
    private ReviewService reviewService;
    
    @Autowired
    private com.nguyenhoanglong.repository.UserRepository userRepository;
    
    private User getCurrentUser() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
            return userRepository.findByEmail(auth.getName()).orElse(null);
        }
        return null;
    }

    @GetMapping
    public ResponseEntity<?> getReviews(
            @PathVariable String slug,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int pageSize,
            @RequestParam(required = false) Integer rating,
            @RequestParam(defaultValue = "newest") String sort) {
        try {
            ReviewSummaryResponse summary = reviewService.getPublicReviews(slug, page, pageSize, rating, sort);
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            // Return empty summary rather than 500 when reviews table not ready
            java.util.logging.Logger.getLogger(ReviewController.class.getName())
                .warning("getReviews failed for slug=" + slug + ": " + e.getMessage());
            ReviewSummaryResponse empty = new ReviewSummaryResponse();
            empty.setItems(java.util.Collections.emptyList());
            empty.setAverageRating(0.0);
            empty.setTotalReviews(0);
            empty.setRatingSummary(new HashMap<>());
            empty.setCurrentPage(page);
            empty.setTotalPages(0);
            return ResponseEntity.ok(empty);
        }
    }

    @GetMapping("/eligibility")
    public ResponseEntity<ReviewEligibilityResponse> checkEligibility(
            @PathVariable String slug,
            @RequestParam(required = false) String orderCode,
            @RequestParam(required = false) String email) {
        
        User user = getCurrentUser();
        ReviewEligibilityResponse eligibility = reviewService.checkEligibility(user, slug, orderCode, email);
        return ResponseEntity.ok(eligibility);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createReview(
            @PathVariable String slug,
            @RequestBody ReviewRequest request) {
        
        User user = getCurrentUser();
        ReviewResponse review = reviewService.createReview(user, slug, request);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", review);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
