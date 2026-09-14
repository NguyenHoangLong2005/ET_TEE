package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.ProductReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {
    List<ProductReview> findByProductSlug(String slug);
    Page<ProductReview> findByProductSlug(String slug, Pageable pageable);
}
