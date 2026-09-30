package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.Category;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    Optional<Category> findByName(String name);

    Optional<Category> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Category> findByActiveTrueOrderByDisplayOrderAscIdAsc();

    List<Category> findAllByOrderByDisplayOrderAscIdAsc();

    List<Category> findByParentIdOrderByDisplayOrderAscIdAsc(Long parentId);

    List<Category> findByParentIdIsNullOrderByDisplayOrderAscIdAsc();

    Page<Category> findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(String nameKeyword, String descKeyword, Pageable pageable);

    @Query("SELECT COUNT(c) > 0 FROM Category c WHERE LOWER(c.name) = LOWER(:name) AND c.parentId IS NULL AND (:id IS NULL OR c.id <> :id)")
    boolean existsByNameAndParentIdIsNull(@Param("name") String name, @Param("id") Long id);

    @Query("SELECT COUNT(c) > 0 FROM Category c WHERE LOWER(c.name) = LOWER(:name) AND c.parentId = :parentId AND (:id IS NULL OR c.id <> :id)")
    boolean existsByNameAndParentId(@Param("name") String name, @Param("parentId") Long parentId, @Param("id") Long id);

    @Query("SELECT COUNT(c) > 0 FROM Category c WHERE LOWER(c.slug) = LOWER(:slug) AND (:id IS NULL OR c.id <> :id)")
    boolean existsBySlugAndIdNot(@Param("slug") String slug, @Param("id") Long id);

    boolean existsByParentId(Long parentId);
}
