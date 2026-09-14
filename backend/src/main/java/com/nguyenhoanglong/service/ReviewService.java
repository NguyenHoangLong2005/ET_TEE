package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.ReviewEligibilityResponse;
import com.nguyenhoanglong.dto.ReviewRequest;
import com.nguyenhoanglong.dto.ReviewResponse;
import com.nguyenhoanglong.dto.ReviewSummaryResponse;
import com.nguyenhoanglong.entity.OrderItem;
import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.entity.ProductReview;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.OrderItemRepository;
import com.nguyenhoanglong.repository.ProductRepository;
import com.nguyenhoanglong.repository.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ReviewService {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private ProductRepository productRepository;

    public ReviewSummaryResponse getPublicReviews(String slug, int page, int pageSize, Integer rating, String sort) {
        Sort sortOrder = Sort.by(Sort.Direction.DESC, "createdAt");
        if ("highest".equalsIgnoreCase(sort)) {
            sortOrder = Sort.by(Sort.Direction.DESC, "rating").and(Sort.by(Sort.Direction.DESC, "createdAt"));
        } else if ("lowest".equalsIgnoreCase(sort)) {
            sortOrder = Sort.by(Sort.Direction.ASC, "rating").and(Sort.by(Sort.Direction.DESC, "createdAt"));
        }

        PageRequest pageRequest = PageRequest.of(page, pageSize, sortOrder);
        
        Page<ProductReview> reviewPage;
        if (rating != null && rating > 0) {
            reviewPage = reviewRepository.findApprovedByProductSlugAndRating(slug, rating, pageRequest);
        } else {
            reviewPage = reviewRepository.findApprovedByProductSlug(slug, pageRequest);
        }

        List<ReviewResponse> items = reviewPage.getContent().stream().map(this::mapToResponse).collect(Collectors.toList());

        Double avg = reviewRepository.getAverageRatingByProductSlug(slug);
        if (avg == null) avg = 0.0;
        
        long total = reviewRepository.countApprovedByProductSlug(slug);
        
        List<Object[]> summaryRaw = reviewRepository.getRatingSummaryByProductSlug(slug);
        Map<Integer, Long> summary = new HashMap<>();
        for (int i = 1; i <= 5; i++) summary.put(i, 0L);
        for (Object[] row : summaryRaw) {
            Integer r = (Integer) row[0];
            Long count = (Long) row[1];
            summary.put(r, count);
        }

        ReviewSummaryResponse response = new ReviewSummaryResponse();
        response.setItems(items);
        response.setAverageRating(Math.round(avg * 10.0) / 10.0);
        response.setTotalReviews(total);
        response.setRatingSummary(summary);
        response.setCurrentPage(page);
        response.setTotalPages(reviewPage.getTotalPages());
        
        return response;
    }

    public ReviewEligibilityResponse checkEligibility(User user, String slug, String orderCode, String email) {
        ReviewEligibilityResponse res = new ReviewEligibilityResponse();
        
        Long productId = productRepository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"))
                .getId();

        List<OrderItem> deliveredItems;

        if (user != null) {
            // Logged-in user logic
            List<OrderItem> allItems = orderItemRepository.findItemsByUserAndProduct(user.getId(), productId);
            if (allItems.isEmpty()) {
                res.setCanReview(false);
                res.setReason("NOT_PURCHASED");
                return res;
            }

            deliveredItems = orderItemRepository.findDeliveredItemsByUserAndProduct(user.getId(), productId);
            if (deliveredItems.isEmpty()) {
                res.setCanReview(false);
                res.setReason("NOT_DELIVERED");
                return res;
            }
        } else if (orderCode != null && email != null) {
            // Guest logic
            com.nguyenhoanglong.entity.Order order = orderItemRepository.findOrderByCode(orderCode);
            if (order == null || !email.equalsIgnoreCase(order.getCustomerEmail())) {
                res.setCanReview(false);
                res.setReason("NOT_PURCHASED"); // Treat as not found/not purchased
                return res;
            }
            
            if (!"DELIVERED".equals(order.getOrderStatus()) && !"COMPLETED".equals(order.getOrderStatus())) {
                res.setCanReview(false);
                res.setReason("NOT_DELIVERED");
                return res;
            }
            
            deliveredItems = orderItemRepository.findItemsByOrderAndProduct(order.getId(), productId);
            if (deliveredItems.isEmpty()) {
                res.setCanReview(false);
                res.setReason("NOT_PURCHASED");
                return res;
            }
        } else {
            res.setCanReview(false);
            res.setReason("NOT_LOGGED_IN");
            return res;
        }

        // Find an unreviewed item
        OrderItem eligibleItem = null;
        for (OrderItem item : deliveredItems) {
            if (!item.isReviewed() && !reviewRepository.existsByOrderItemId(item.getId())) {
                eligibleItem = item;
                break;
            }
        }

        if (eligibleItem == null) {
            res.setCanReview(false);
            res.setReason("ALREADY_REVIEWED");
            return res;
        }

        res.setCanReview(true);
        res.setReason("ELIGIBLE");
        res.setOrderItemId(eligibleItem.getId());
        res.setPurchasedSize(eligibleItem.getSizeSnapshot());
        res.setPurchasedColor(eligibleItem.getColorSnapshot());
        return res;
    }

    @Transactional
    public ReviewResponse createReview(User user, String slug, ReviewRequest request) {
        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rating must be between 1 and 5");
        }
        if (request.getContent() == null || request.getContent().trim().length() < 10) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nội dung đánh giá quá ngắn");
        }

        OrderItem orderItem = orderItemRepository.findById(request.getOrderItemId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order item not found"));

        if (!orderItem.getProduct().getSlug().equals(slug)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mismatched product");
        }

        com.nguyenhoanglong.entity.Order order = orderItem.getOrder();
        String customerName = "Khách hàng";

        if (user != null) {
            if (order.getUser() == null || !order.getUser().getId().equals(user.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_PURCHASED");
            }
            customerName = user.getFullName() != null ? user.getFullName() : customerName;
        } else {
            // Guest check
            if (request.getOrderCode() == null || request.getCustomerEmailOrPhone() == null) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing order authentication for guest review");
            }
            if (!request.getOrderCode().equals(order.getOrderCode()) || 
                !request.getCustomerEmailOrPhone().equalsIgnoreCase(order.getCustomerEmail())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_PURCHASED");
            }
            customerName = order.getCustomerName() != null ? order.getCustomerName() : customerName;
        }

        String orderStatus = order.getOrderStatus();
        if (!"DELIVERED".equals(orderStatus) && !"COMPLETED".equals(orderStatus)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_DELIVERED");
        }

        if (orderItem.isReviewed() || reviewRepository.existsByOrderItemId(orderItem.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ALREADY_REVIEWED");
        }

        Product product = orderItem.getProduct();

        ProductReview review = new ProductReview();
        review.setProduct(product);
        review.setUser(user);
        review.setOrderItem(orderItem);
        review.setRating(request.getRating());
        review.setContent(request.getContent());
        review.setVerifiedPurchase(true);
        review.setStatus("APPROVED"); // Default to approved unless moderation is active
        
        // Snapshots
        review.setPurchasedSize(orderItem.getSizeSnapshot());
        review.setPurchasedColor(orderItem.getColorSnapshot());
        
        String cName = "Khách Hàng";
        if (user != null) {
            cName = user.getFullName() != null ? user.getFullName() : cName;
        } else if (orderItem.getOrder().getCustomerName() != null) {
            cName = orderItem.getOrder().getCustomerName();
        }
        review.setCustomerNameSnapshot(cName);

        review = reviewRepository.save(review);
        
        orderItem.setReviewed(true);
        orderItemRepository.save(orderItem);
        
        return mapToResponse(review);
    }

    public List<ReviewResponse> getUserReviews(String userId) {
        return reviewRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private ReviewResponse mapToResponse(ProductReview review) {
        ReviewResponse res = new ReviewResponse();
        res.setId(review.getId());
        res.setRating(review.getRating());
        res.setContent(review.getContent());
        res.setCustomerNameSnapshot(review.getCustomerNameSnapshot());
        res.setPurchasedSize(review.getPurchasedSize());
        res.setPurchasedColor(review.getPurchasedColor());
        res.setCreatedAt(review.getCreatedAt());
        res.setProductSlug(review.getProduct().getSlug());
        res.setProductName(review.getProduct().getName());
        res.setStatus(review.getStatus());
        return res;
    }
}
