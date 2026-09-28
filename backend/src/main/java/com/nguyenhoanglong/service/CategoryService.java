package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface CategoryService {

    List<CategoryDto> getPublicCategories();

    List<CategoryTreeDto> getCategoryTree();

    Page<CategoryDto> getAdminCategories(String keyword, Pageable pageable);

    CategoryDto getCategoryById(Long id);

    CategoryDto createCategory(CategoryDto dto);

    CategoryDto updateCategory(Long id, CategoryDto dto);

    void reorderCategories(List<CategoryReorderDto> reorders);

    void deleteCategory(Long id);

    StoreCategoryConfigDto getStoreCategoryConfig(Long shopId);

    StoreCategoryConfigDto updateStoreCategoryConfig(Long shopId, List<Long> categoryIds);
}
