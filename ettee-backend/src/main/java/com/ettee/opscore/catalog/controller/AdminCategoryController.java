package com.ettee.opscore.catalog.controller;

import com.ettee.opscore.catalog.dto.CategoryDto;
import com.ettee.opscore.catalog.dto.UpsertCategoryRequest;
import com.ettee.opscore.catalog.service.CategoryService;
import com.ettee.opscore.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Nghiệp vụ "Danh mục toàn hệ thống" — permission product.manage (chỉ admin mới sửa cấu trúc gốc). */
@RestController
@RequestMapping("/api/admin/categories")
@RequiredArgsConstructor
public class AdminCategoryController {

    private final CategoryService categoryService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('product.manage', 'report.view')")
    public ApiResponse<List<CategoryDto>> getTree() {
        return ApiResponse.ok(categoryService.getTree());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('product.manage')")
    public ApiResponse<CategoryDto> create(@Valid @RequestBody UpsertCategoryRequest request) {
        return ApiResponse.ok(categoryService.create(request), "Đã tạo danh mục");
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('product.manage')")
    public ApiResponse<CategoryDto> update(@PathVariable UUID id, @Valid @RequestBody UpsertCategoryRequest request) {
        return ApiResponse.ok(categoryService.update(id, request), "Đã cập nhật danh mục");
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('product.manage')")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        categoryService.delete(id);
        return ApiResponse.message("Đã xóa danh mục");
    }
}
