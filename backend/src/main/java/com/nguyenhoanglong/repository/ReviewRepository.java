package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.ProductReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<ProductReview, Long> {

    @Query("SELECT r FROM ProductReview r WHERE r.product.slug = :slug AND r.status = 'APPROVED' AND r.deletedAt IS NULL")
    Page<ProductReview> findApprovedByProductSlug(@Param("slug") String slug, Pageable pageable);

    @Query("SELECT r FROM ProductReview r WHERE r.orderItem.id = :orderItemId")
    Optional<ProductReview> findByOrderItemId(@Param("orderItemId") Long orderItemId);

    List<ProductReview> findByUserIdOrderByCreatedAtDesc(String userId);

    @Query("SELECT r FROM ProductReview r WHERE r.product.slug = :slug AND r.status = 'APPROVED' AND r.deletedAt IS NULL AND r.rating = :rating")
    Page<ProductReview> findApprovedByProductSlugAndRating(@Param("slug") String slug, @Param("rating") Integer rating, Pageable pageable);

    @Query("SELECT COUNT(r) FROM ProductReview r WHERE r.product.slug = :slug AND r.status = 'APPROVED' AND r.deletedAt IS NULL")
    long countApprovedByProductSlug(@Param("slug") String slug);

    @Query("SELECT AVG(r.rating) FROM ProductReview r WHERE r.product.slug = :slug AND r.status = 'APPROVED' AND r.deletedAt IS NULL")
    Double getAverageRatingByProductSlug(@Param("slug") String slug);

    @Query("SELECT r.rating, COUNT(r) FROM ProductReview r WHERE r.product.slug = :slug AND r.status = 'APPROVED' AND r.deletedAt IS NULL GROUP BY r.rating")
    List<Object[]> getRatingSummaryByProductSlug(@Param("slug") String slug);
    
    boolean existsByOrderItemId(Long orderItemId);
}
