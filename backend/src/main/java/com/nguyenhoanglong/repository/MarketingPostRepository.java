package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.MarketingPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MarketingPostRepository extends JpaRepository<MarketingPost, Long> {

    Optional<MarketingPost> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<MarketingPost> findByStatusOrderByCreatedAtDesc(String status);

    List<MarketingPost> findAllByOrderByCreatedAtDesc();

    @Query("SELECT p FROM MarketingPost p WHERE " +
           "(:status IS NULL OR p.status = :status) AND " +
           "(:query IS NULL OR LOWER(p.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.slug) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY p.createdAt DESC")
    List<MarketingPost> searchPosts(@Param("status") String status, @Param("query") String query);

    long countByStatus(String status);

    // Atomic so concurrent readers don't overwrite each other's increment.
    @Modifying
    @Query("UPDATE MarketingPost p SET p.views = p.views + 1 WHERE p.slug = :slug AND p.status = 'PUBLISHED'")
    int incrementViewsBySlug(@Param("slug") String slug);
}
