package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.ReviewEligibilityResponse;
import com.nguyenhoanglong.dto.ReviewRequest;
import com.nguyenhoanglong.dto.ReviewResponse;
import com.nguyenhoanglong.entity.Order;
import com.nguyenhoanglong.entity.OrderItem;
import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.entity.ProductReview;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.OrderItemRepository;
import com.nguyenhoanglong.repository.ProductRepository;
import com.nguyenhoanglong.repository.ReviewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock private ReviewRepository reviewRepository;
    @Mock private OrderItemRepository orderItemRepository;
    @Mock private ProductRepository productRepository;

    @InjectMocks private ReviewService reviewService;

    private User user;
    private Product product;
    private Order order;
    private OrderItem deliveredItem;
    private OrderItem notDeliveredItem;
    private ProductReview existingReview;

    private static void setField(Object o, String name, Object value) throws Exception {
        Field f = o.getClass().getDeclaredField(name);
        f.setAccessible(true);
        f.set(o, value);
    }

    @BeforeEach
    void setUp() throws Exception {
        user = new User();
        setField(user, "id", "user-1");
        user.setEmail("user@example.com");
        user.setFullName("Test User");

        product = new Product();
        setField(product, "id", 100L);
        product.setSlug("ao-test");
        product.setName("Áo test");

        order = new Order();
        try { setField(order, "id", 10L); } catch (Exception ignored) {}
        order.setOrderCode("DH1234567890");
        order.setUser(user);
        order.setOrderStatus("DELIVERED");
        order.setCustomerEmail("user@example.com");
        order.setCustomerName("Test User");

        deliveredItem = new OrderItem();
        try { setField(deliveredItem, "id", 1L); } catch (Exception ignored) {}
        deliveredItem.setOrder(order);
        deliveredItem.setProduct(product);
        deliveredItem.setReviewed(false);
        deliveredItem.setSizeSnapshot("M");
        deliveredItem.setColorSnapshot("Đen");

        notDeliveredItem = new OrderItem();
        try { setField(notDeliveredItem, "id", 2L); } catch (Exception ignored) {}
        notDeliveredItem.setOrder(order);
        notDeliveredItem.setProduct(product);
        notDeliveredItem.setReviewed(false);

        existingReview = new ProductReview();
        try { setField(existingReview, "id", 99L); } catch (Exception ignored) {}
        existingReview.setProduct(product);
        existingReview.setUser(user);
        existingReview.setOrderItem(deliveredItem);
        existingReview.setRating(5);
        existingReview.setContent("old review");
        existingReview.setStatus("APPROVED");
    }

    @Test
    void eligibility_loggedInUser_deliveredOrder_returnsEligible() {
        when(productRepository.findBySlug("ao-test")).thenReturn(Optional.of(product));
        when(orderItemRepository.findItemsByUserAndProduct("user-1", 100L))
                .thenReturn(List.of(deliveredItem));
        when(orderItemRepository.findDeliveredItemsByUserAndProduct("user-1", 100L))
                .thenReturn(List.of(deliveredItem));
        when(reviewRepository.existsByOrderItemId(1L)).thenReturn(false);

        ReviewEligibilityResponse res = reviewService.checkEligibility(user, "ao-test", null, null);

        assertThat(res.isCanReview()).isTrue();
        assertThat(res.getReason()).isEqualTo("ELIGIBLE");
        assertThat(res.getOrderItemId()).isEqualTo(1L);
    }

    @Test
    void eligibility_loggedInUser_notPurchased_returnsNotPurchased() {
        when(productRepository.findBySlug("ao-test")).thenReturn(Optional.of(product));
        when(orderItemRepository.findItemsByUserAndProduct("user-1", 100L)).thenReturn(List.of());

        ReviewEligibilityResponse res = reviewService.checkEligibility(user, "ao-test", null, null);

        assertThat(res.isCanReview()).isFalse();
        assertThat(res.getReason()).isEqualTo("NOT_PURCHASED");
    }

    @Test
    void eligibility_loggedInUser_notDelivered_returnsNotDelivered() {
        // Find items by user/product, but nothing delivered
        when(productRepository.findBySlug("ao-test")).thenReturn(Optional.of(product));
        when(orderItemRepository.findItemsByUserAndProduct("user-1", 100L))
                .thenReturn(List.of(notDeliveredItem));
        when(orderItemRepository.findDeliveredItemsByUserAndProduct("user-1", 100L))
                .thenReturn(List.of());

        ReviewEligibilityResponse res = reviewService.checkEligibility(user, "ao-test", null, null);

        assertThat(res.isCanReview()).isFalse();
        assertThat(res.getReason()).isEqualTo("NOT_DELIVERED");
    }

    @Test
    void eligibility_alreadyReviewed_returnsAlreadyReviewed() {
        when(productRepository.findBySlug("ao-test")).thenReturn(Optional.of(product));
        when(orderItemRepository.findItemsByUserAndProduct("user-1", 100L))
                .thenReturn(List.of(deliveredItem));
        when(orderItemRepository.findDeliveredItemsByUserAndProduct("user-1", 100L))
                .thenReturn(List.of(deliveredItem));
        when(reviewRepository.existsByOrderItemId(1L)).thenReturn(true);

        ReviewEligibilityResponse res = reviewService.checkEligibility(user, "ao-test", null, null);

        assertThat(res.isCanReview()).isFalse();
        assertThat(res.getReason()).isEqualTo("ALREADY_REVIEWED");
    }

    @Test
    void eligibility_guestWithoutOrderCode_returnsNotLoggedIn() {
        when(productRepository.findBySlug("ao-test")).thenReturn(Optional.of(product));
        ReviewEligibilityResponse res = reviewService.checkEligibility(null, "ao-test", null, null);
        assertThat(res.isCanReview()).isFalse();
        assertThat(res.getReason()).isEqualTo("NOT_LOGGED_IN");
    }

    @Test
    void eligibility_guest_deliveredOrder_returnsEligible() {
        when(productRepository.findBySlug("ao-test")).thenReturn(Optional.of(product));
        Order guestOrder = new Order();
        try { setField(guestOrder, "id", 10L); } catch (Exception ignored) {}
        guestOrder.setOrderCode("DH1234567890");
        guestOrder.setCustomerEmail("guest@example.com");
        guestOrder.setOrderStatus("DELIVERED");
        when(orderItemRepository.findOrderByCode("DH1234567890")).thenReturn(guestOrder);
        when(orderItemRepository.findItemsByOrderAndProduct(10L, 100L)).thenReturn(List.of(deliveredItem));
        when(reviewRepository.existsByOrderItemId(1L)).thenReturn(false);

        ReviewEligibilityResponse res = reviewService.checkEligibility(null, "ao-test", "DH1234567890", "guest@example.com");
        assertThat(res.isCanReview()).isTrue();
        assertThat(res.getReason()).isEqualTo("ELIGIBLE");
    }

    @Test
    void createReview_invalidRating_throws() {
        ReviewRequest req = new ReviewRequest();
        req.setOrderItemId(1L);
        req.setRating(7); // out of range
        req.setContent("ok this is a long enough review");
        assertThatThrownBy(() -> reviewService.createReview(user, "ao-test", req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("1 and 5");
    }

    @Test
    void createReview_contentTooShort_throws() {
        ReviewRequest req = new ReviewRequest();
        req.setOrderItemId(1L);
        req.setRating(5);
        req.setContent("too short");
        assertThatThrownBy(() -> reviewService.createReview(user, "ao-test", req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("ngắn");
    }

    @Test
    void createReview_notDelivered_throwsNotDelivered() {
        // Use a non-delivered order
        Order pendingOrder = new Order();
        try { setField(pendingOrder, "id", 11L); } catch (Exception ignored) {}
        pendingOrder.setOrderCode("DH2222222222");
        pendingOrder.setUser(user);
        pendingOrder.setOrderStatus("PROCESSING");

        OrderItem pendingItem = new OrderItem();
        try { setField(pendingItem, "id", 3L); } catch (Exception ignored) {}
        pendingItem.setOrder(pendingOrder);
        pendingItem.setProduct(product);
        pendingItem.setReviewed(false);

        when(orderItemRepository.findById(3L)).thenReturn(Optional.of(pendingItem));

        ReviewRequest req = new ReviewRequest();
        req.setOrderItemId(3L);
        req.setRating(5);
        req.setContent("This is at least ten characters long");
        assertThatThrownBy(() -> reviewService.createReview(user, "ao-test", req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("NOT_DELIVERED");
    }

    @Test
    void createReview_alreadyReviewed_throwsConflict() {
        when(orderItemRepository.findById(1L)).thenReturn(Optional.of(deliveredItem));
        when(reviewRepository.existsByOrderItemId(1L)).thenReturn(true);

        ReviewRequest req = new ReviewRequest();
        req.setOrderItemId(1L);
        req.setRating(5);
        req.setContent("This is at least ten characters long");
        assertThatThrownBy(() -> reviewService.createReview(user, "ao-test", req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("ALREADY_REVIEWED");
    }

    @Test
    void createReview_wrongOwner_throws() {
        // deliveredItem belongs to `user`, but we try to submit a review as another user
        User other = new User();
        try { setField(other, "id", "user-2"); } catch (Exception ignored) {}

        when(orderItemRepository.findById(1L)).thenReturn(Optional.of(deliveredItem));

        ReviewRequest req = new ReviewRequest();
        req.setOrderItemId(1L);
        req.setRating(5);
        req.setContent("This is at least ten characters long");
        assertThatThrownBy(() -> reviewService.createReview(other, "ao-test", req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("NOT_PURCHASED");
    }

    @Test
    void createReview_happyPath_savesAndMarksReviewed() {
        when(orderItemRepository.findById(1L)).thenReturn(Optional.of(deliveredItem));
        when(reviewRepository.existsByOrderItemId(1L)).thenReturn(false);
        when(reviewRepository.save(any(ProductReview.class))).thenAnswer(inv -> {
            ProductReview r = inv.getArgument(0);
            try { setField(r, "id", 50L); } catch (Exception ignored) {}
            return r;
        });

        ReviewRequest req = new ReviewRequest();
        req.setOrderItemId(1L);
        req.setRating(5);
        req.setContent("Sản phẩm rất đẹp, chất liệu tốt.");
        ReviewResponse res = reviewService.createReview(user, "ao-test", req);

        assertThat(res.getRating()).isEqualTo(5);
        assertThat(res.getProductSlug()).isEqualTo("ao-test");
        assertThat(deliveredItem.isReviewed()).isTrue();
        verify(reviewRepository, times(1)).save(any(ProductReview.class));
        verify(orderItemRepository, times(1)).save(deliveredItem);
    }

    @Test
    void createReview_guest_wrongEmail_throws() {
        // guestOrder has customerEmail "guest@example.com" but the request sends something else
        Order guestOrder = new Order();
        try { setField(guestOrder, "id", 10L); } catch (Exception ignored) {}
        guestOrder.setOrderCode("DH1234567890");
        guestOrder.setCustomerEmail("guest@example.com");
        guestOrder.setOrderStatus("DELIVERED");
        OrderItem guestItem = new OrderItem();
        try { setField(guestItem, "id", 1L); } catch (Exception ignored) {}
        guestItem.setOrder(guestOrder);
        guestItem.setProduct(product);

        when(orderItemRepository.findById(1L)).thenReturn(Optional.of(guestItem));

        ReviewRequest req = new ReviewRequest();
        req.setOrderItemId(1L);
        req.setRating(5);
        req.setContent("This is at least ten characters long");
        req.setOrderCode("DH1234567890");
        req.setCustomerEmailOrPhone("not-the-customer@example.com");

        assertThatThrownBy(() -> reviewService.createReview(null, "ao-test", req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("NOT_PURCHASED");
    }
}
