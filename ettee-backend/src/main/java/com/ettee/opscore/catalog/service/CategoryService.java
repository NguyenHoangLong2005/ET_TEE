package com.ettee.opscore.catalog.service;

import com.ettee.opscore.catalog.dto.CategoryDto;
import com.ettee.opscore.catalog.dto.UpsertCategoryRequest;
import com.ettee.opscore.catalog.entity.Category;
import com.ettee.opscore.catalog.repository.CategoryRepository;
import com.ettee.opscore.common.exception.AppExceptions;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public List<CategoryDto> getTree() {
        List<Category> all = categoryRepository.findAllByOrderBySortOrderAsc();
        Map<UUID, List<Category>> byParent = all.stream()
                .filter(c -> c.getParentId() != null)
                .collect(Collectors.groupingBy(Category::getParentId));
        List<Category> roots = all.stream().filter(c -> c.getParentId() == null).toList();
        return roots.stream().map(c -> toDto(c, byParent)).toList();
    }

    private CategoryDto toDto(Category c, Map<UUID, List<Category>> byParent) {
        List<CategoryDto> children = byParent.getOrDefault(c.getId(), List.of())
                .stream().map(child -> toDto(child, byParent)).toList();
        return new CategoryDto(c.getId(), c.getParentId(), c.getName(), c.getSlug(), c.getDescription(),
                c.getImageUrl(), c.isActive(), c.getSortOrder(), children);
    }

    @Transactional
    public CategoryDto create(UpsertCategoryRequest request) {
        if (categoryRepository.existsBySlug(request.slug())) {
            throw new AppExceptions.BusinessRuleViolationException("Slug '" + request.slug() + "' đã tồn tại");
        }
        if (request.parentId() != null && !categoryRepository.existsById(request.parentId())) {
            throw new AppExceptions.ResourceNotFoundException("Danh mục cha", request.parentId());
        }
        Category c = new Category();
        apply(c, request);
        c = categoryRepository.save(c);
        return toDto(c, Map.of());
    }

    @Transactional
    public CategoryDto update(UUID id, UpsertCategoryRequest request) {
        Category c = categoryRepository.findById(id)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Danh mục", id));
        if (!c.getSlug().equals(request.slug()) && categoryRepository.existsBySlug(request.slug())) {
            throw new AppExceptions.BusinessRuleViolationException("Slug '" + request.slug() + "' đã tồn tại");
        }
        if (request.parentId() != null && request.parentId().equals(id)) {
            throw new AppExceptions.BusinessRuleViolationException("Danh mục không thể là cha của chính nó");
        }
        apply(c, request);
        c = categoryRepository.save(c);
        return toDto(c, Map.of());
    }

    private void apply(Category c, UpsertCategoryRequest r) {
        c.setParentId(r.parentId());
        c.setName(r.name());
        c.setSlug(r.slug());
        c.setDescription(r.description());
        c.setImageUrl(r.imageUrl());
        if (r.active() != null) c.setActive(r.active());
        if (r.sortOrder() != null) c.setSortOrder(r.sortOrder());
    }

    @Transactional
    public void delete(UUID id) {
        if (!categoryRepository.existsById(id)) {
            throw new AppExceptions.ResourceNotFoundException("Danh mục", id);
        }
        if (categoryRepository.countByParentId(id) > 0) {
            throw new AppExceptions.BusinessRuleViolationException("Không thể xóa danh mục còn danh mục con — hãy xóa/di chuyển con trước");
        }
        // products.category_id là NOT NULL REFERENCES categories(id) không ON DELETE CASCADE
        // -> nếu còn sản phẩm gắn danh mục này, Postgres sẽ tự chặn bằng FK constraint (bắt ở GlobalExceptionHandler).
        categoryRepository.deleteById(id);
    }
}
