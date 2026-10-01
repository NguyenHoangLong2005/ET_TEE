package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    Optional<Product> findBySlug(String slug);

    @Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.category LEFT JOIN FETCH p.variants")
    List<Product> findAllWithDetails();

    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category LEFT JOIN FETCH p.variants WHERE p.id = :id")
    Optional<Product> findByIdWithDetails(Long id);

    // "Similar"/"outfit" carousels used to load the entire products table
    // (findAll()) into memory on every product detail page view, just to
    // pick 4 rows out of it. Push the filter and the LIMIT 4 to the DB.
    @Query("SELECT p FROM Product p WHERE p.status = 'ACTIVE' AND p.productType = :productType AND p.id <> :excludeId")
    List<Product> findSimilarActive(@org.springframework.data.repository.query.Param("productType") String productType,
                                     @org.springframework.data.repository.query.Param("excludeId") Long excludeId,
                                     org.springframework.data.domain.Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.status = 'ACTIVE' AND p.targetGroup = :targetGroup AND p.id <> :excludeId " +
           "AND (p.productType IS NULL OR :productType IS NULL OR p.productType <> :productType)")
    List<Product> findOutfitCandidates(@org.springframework.data.repository.query.Param("targetGroup") String targetGroup,
                                        @org.springframework.data.repository.query.Param("productType") String productType,
                                        @org.springframework.data.repository.query.Param("excludeId") Long excludeId,
                                        org.springframework.data.domain.Pageable pageable);

    /** Products carry the manufacturer only as free text (brand), so match on it. */
    long countByBrandIgnoreCase(String brand);

    /** Products (not deleted) that name this supplier. */
    long countBySupplierId(Long supplierId);

    /** Products (not deleted) made by this manufacturer. */
    long countByManufacturerId(Long manufacturerId);

    List<Product> findByCategoryId(Long categoryId);
    org.springframework.data.domain.Page<Product> findByCategoryId(Long categoryId, org.springframework.data.domain.Pageable pageable);
    org.springframework.data.domain.Page<Product> findByNameContainingIgnoreCase(String name, org.springframework.data.domain.Pageable pageable);

    // Stats: count of active products grouped by targetGroup
    @Query("SELECT p.targetGroup, COUNT(p) FROM Product p WHERE p.status = 'ACTIVE' GROUP BY p.targetGroup")
    java.util.List<Object[]> countActiveByTargetGroup();

    // Stats: count of active products grouped by productType (NULL treated as 'other')
    @Query("SELECT COALESCE(p.productType, 'other'), COUNT(p) FROM Product p WHERE p.status = 'ACTIVE' GROUP BY p.productType")
    java.util.List<Object[]> countActiveByProductType();

    // Stats: count of active products grouped by category.slug (NULL treated as 'uncategorized')
    @Query("SELECT COALESCE(c.slug, 'uncategorized'), COUNT(p) FROM Product p LEFT JOIN p.category c WHERE p.status = 'ACTIVE' GROUP BY c.slug")
    java.util.List<Object[]> countActiveByCategory();

    @Query("SELECT COUNT(p) FROM Product p WHERE p.status = 'ACTIVE'")
    long countActive();

    // Stats: kids products broken down by gender (for sidebar boy/girl counts)
    @Query("SELECT p.gender, COUNT(p) FROM Product p WHERE p.status = 'ACTIVE' AND p.targetGroup = 'kids' GROUP BY p.gender")
    java.util.List<Object[]> countActiveKidsByGender();

    // Stats: distinct sizes and their target groups
    @Query("SELECT DISTINCT v.size, p.targetGroup FROM ProductVariant v JOIN v.product p WHERE p.status = 'ACTIVE' AND v.size IS NOT NULL")
    java.util.List<Object[]> findDistinctSizesAndTargetGroups();

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Product p SET p.totalReviews = (SELECT COUNT(r) FROM ProductReview r WHERE r.product.id = p.id AND r.status = 'APPROVED'), p.averageRating = COALESCE((SELECT CAST(AVG(r.rating) AS Double) FROM ProductReview r WHERE r.product.id = p.id AND r.status = 'APPROVED'), 0.0) WHERE p.id = :productId")
    void recalculateProductRating(@org.springframework.data.repository.query.Param("productId") Long productId);

    /**
     * Cong so luong da ban, nguyen tu ngay trong DB.
     * Doc-roi-ghi (getSoldCount() + n rồi save) se mat cap nhat khi hai don cung
     * hoan tat song song tren cung mot san pham.
     */
    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "UPDATE products SET sold_count = COALESCE(sold_count, 0) + :quantity WHERE id = :productId",
           nativeQuery = true)
    void incrementSoldCount(@org.springframework.data.repository.query.Param("productId") Long productId,
                            @org.springframework.data.repository.query.Param("quantity") int quantity);

    /** Tru so luong da ban, chan xuong duoi 0. */
    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "UPDATE products SET sold_count = GREATEST(COALESCE(sold_count, 0) - :quantity, 0) WHERE id = :productId",
           nativeQuery = true)
    void decrementSoldCount(@org.springframework.data.repository.query.Param("productId") Long productId,
                            @org.springframework.data.repository.query.Param("quantity") int quantity);
}
