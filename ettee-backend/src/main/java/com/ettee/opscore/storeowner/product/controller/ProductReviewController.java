package com.ettee.opscore.storeowner.product.controller;

import com.ettee.opscore.common.dto.ApiResponse;
import com.ettee.opscore.storeowner.product.dto.ProductReviewDto;
import com.ettee.opscore.storeowner.product.dto.CreateProductReviewRequest;
import com.ettee.opscore.common.exception.AppExceptions;
import com.ettee.opscore.security.JwtPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductReviewController {
    private final JdbcTemplate jdbcTemplate;

    @GetMapping("/{productId}/reviews")
    public ApiResponse<List<ProductReviewDto>> list(@PathVariable UUID productId) {
        List<ProductReviewDto> reviews = jdbcTemplate.query("""
                select r.id, r.rating, r.comment, r.created_at
                from ettee.reviews r
                join ettee.order_items oi on oi.id = r.order_item_id
                join ettee.product_variants v on v.id = oi.variant_id
                where v.product_id = ? and r.status::text = 'published'
                order by r.created_at desc
                """, (rs, rowNum) -> new ProductReviewDto(
                rs.getObject("id", UUID.class),
                rs.getShort("rating"),
                rs.getString("comment"),
                rs.getTimestamp("created_at").toInstant()), productId);
        return ApiResponse.ok(reviews);
    }

    @PostMapping("/{productId}/reviews")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ApiResponse<ProductReviewDto> create(
            @PathVariable UUID productId,
            @AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody CreateProductReviewRequest request) {
        UUID orderItemId = jdbcTemplate.query("""
                select oi.id
                from ettee.order_items oi
                join ettee.orders o on o.id = oi.order_id
                join ettee.customers c on c.id = o.customer_id
                join ettee.product_variants v on v.id = oi.variant_id
                where oi.id = ? and v.product_id = ? and c.user_id = ? and o.status = 'delivered'
                  and not exists (select 1 from ettee.reviews r where r.order_item_id = oi.id)
                """, rs -> rs.next() ? rs.getObject("id", UUID.class) : null,
                request.orderItemId(), productId, principal.userId());
        if (orderItemId == null) {
            throw new AppExceptions.ForbiddenActionException("Chỉ khách đã mua và nhận sản phẩm mới được đánh giá");
        }

        UUID authorizationId = UUID.randomUUID();
        jdbcTemplate.update("""
                insert into ettee.review_authorizations
                    (id, order_item_id, customer_id, method, verified_at, expires_at)
                select ?, oi.id, c.id, 'authenticated', now(), now() + interval '30 days'
                from ettee.order_items oi
                join ettee.orders o on o.id = oi.order_id
                join ettee.customers c on c.id = o.customer_id
                where oi.id = ? and c.user_id = ?
                """, authorizationId, orderItemId, principal.userId());
        UUID reviewId = UUID.randomUUID();
        jdbcTemplate.update(
                "insert into ettee.reviews (id, order_item_id, customer_id, authorization_id, rating, comment, status) "
                        + "select ?, oi.id, c.id, ?, ?, ?, 'published'::review_status from ettee.order_items oi "
                        + "join ettee.orders o on o.id = oi.order_id join ettee.customers c on c.id = o.customer_id "
                        + "where oi.id = ? and c.user_id = ?",
                reviewId, authorizationId, request.rating(), request.comment(), orderItemId, principal.userId());
        return ApiResponse.ok(
                new ProductReviewDto(reviewId, request.rating(), request.comment(), java.time.Instant.now()),
                "Đã gửi đánh giá");
    }
}