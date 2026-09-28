package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.CategoryDto;
import com.nguyenhoanglong.dto.StoreCategoryConfigDto;
import com.nguyenhoanglong.service.CategoryService;
import com.nguyenhoanglong.service.CurrentUserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * /config quan ly danh muc NOI BAT theo chi nhanh (StoreFeaturedCategory, co
 * shop_id) - SHOP_OWNER duoc sua trong pham vi chi nhanh minh.
 *
 * Cac endpoint CRUD danh muc GOC (createCategory/updateCategory/deleteCategory
 * ben duoi) thao tac thang len bang categories dung chung toan he thong -
 * Category KHONG co shop_id, "danh muc rieng cua chi nhanh" khong ton tai
 * trong mo hinh du lieu. Truoc day cac endpoint nay cho SHOP_OWNER goi, tuc
 * la SHOP_OWNER sua duoc danh muc dung chung - da sua thanh chi ADMIN.
 */
@RestController
@RequestMapping("/api/store-owner/categories")
public class StoreOwnerCategoryController {

    private final CategoryService categoryService;
    private final CurrentUserService currentUserService;

    public StoreOwnerCategoryController(CategoryService categoryService, CurrentUserService currentUserService) {
        this.categoryService = categoryService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/config")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getStoreCategoryConfig(@RequestParam(required = false) Long shopId) {
        Long targetShopId = currentUserService.resolveShopIdForWrite(shopId);
        StoreCategoryConfigDto config = categoryService.getStoreCategoryConfig(targetShopId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", config);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/config")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> updateStoreCategoryConfig(
            @RequestParam(required = false) Long shopId,
            @RequestBody Map<String, List<Long>> body) {
        Long targetShopId = currentUserService.resolveShopIdForWrite(shopId);
        List<Long> categoryIds = body.get("categoryIds");
        if (categoryIds == null) {
            categoryIds = body.get("featuredCategoryIds");
        }

        StoreCategoryConfigDto updated = categoryService.updateStoreCategoryConfig(targetShopId, categoryIds);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Cập nhật cấu hình danh mục shop thành công");
        response.put("data", updated);
        return ResponseEntity.ok(response);
    }

    // ── CRUD danh mục (Store Owner quản lý danh mục riêng của chi nhánh) ──

    @GetMapping
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> listCategories(
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        Page<CategoryDto> result = categoryService.getAdminCategories(keyword, PageRequest.of(page, size));
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", Map.of(
                "items", result.getContent(),
                "total", result.getTotalElements(),
                "page", result.getNumber(),
                "totalPages", result.getTotalPages()
        ));
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
    public ResponseEntity<Map<String, Object>> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody CategoryDto dto) {
        CategoryDto updated = categoryService.updateCategory(id, dto);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Cập nhật danh mục thành công");
        response.put("data", updated);
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
