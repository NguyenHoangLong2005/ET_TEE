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

    List<Product> findByCategoryId(Long categoryId);

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
}
