package com.nguyenhoanglong.controller.admin;

import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.service.CategoryService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/categories")
@PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_GLOBAL_CATEGORY)")
public class AdminCategoryController {

    private final CategoryService categoryService;

    public AdminCategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping("/tree")
    @PreAuthorize("hasAnyRole('ADMIN', 'SHOP_OWNER', 'MARKETING_STAFF', 'SALES_STAFF', 'WAREHOUSE_STAFF', 'SHIPPING_STAFF')")
    public ResponseEntity<Map<String, Object>> getCategoryTree() {
        List<CategoryTreeDto> tree = categoryService.getCategoryTree();
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", tree);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SHOP_OWNER', 'MARKETING_STAFF')")
    public ResponseEntity<Map<String, Object>> getAdminCategories(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<CategoryDto> pageData = categoryService.getAdminCategories(keyword, pageable);

        Map<String, Object> data = new HashMap<>();
        data.put("items", pageData.getContent());
        data.put("totalElements", pageData.getTotalElements());
        data.put("totalPages", pageData.getTotalPages());
        data.put("currentPage", pageData.getNumber());

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", data);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SHOP_OWNER', 'MARKETING_STAFF')")
    public ResponseEntity<Map<String, Object>> getCategoryById(@PathVariable Long id) {
        CategoryDto dto = categoryService.getCategoryById(id);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", dto);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> createCategory(@Valid @RequestBody CategoryDto dto) {
        CategoryDto created = categoryService.createCategory(dto);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Tạo danh mục thành công");
        response.put("data", created);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryDto dto) {
        CategoryDto updated = categoryService.updateCategory(id, dto);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Cập nhật danh mục thành công");
        response.put("data", updated);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/reorder")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> reorderCategories(@RequestBody List<CategoryReorderDto> reorders) {
        categoryService.reorderCategories(reorders);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Sắp xếp danh mục thành công");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Xóa danh mục thành công");
        return ResponseEntity.ok(response);
    }
}

