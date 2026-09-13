package com.ettee.opscore.catalog.repository;

import com.ettee.opscore.catalog.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    List<Category> findAllByOrderBySortOrderAsc();
    List<Category> findByParentId(UUID parentId);
    Optional<Category> findBySlug(String slug);
    boolean existsBySlug(String slug);
    long countByParentId(UUID parentId);
}
