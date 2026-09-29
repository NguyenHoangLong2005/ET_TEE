package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.ApiResponse;
import com.nguyenhoanglong.dto.PaginatedResponseDto;
import com.nguyenhoanglong.dto.ProductDto;
import com.nguyenhoanglong.dto.ProductStatsDto;
import com.nguyenhoanglong.service.ProductService;
import com.nguyenhoanglong.service.ProductStatsService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;
    private final ProductStatsService productStatsService;

    public ProductController(ProductService productService, ProductStatsService productStatsService) {
        this.productService = productService;
        this.productStatsService = productStatsService;
    }

    /**
     * Aggregated stats for the catalog sidebar (real DB counts).
     * Returns: { targetGroup: {men, women, kids, family, baby}, productType: {...}, category: {...}, totalActive }.
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<ProductStatsDto>> getStats() {
        return ResponseEntity.ok(ApiResponse.success(productStatsService.getStats()));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PaginatedResponseDto<ProductDto>>> getProducts(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String targetGroup,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String productType,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String adultSize,
            @RequestParam(required = false) String kidsSize,
            @RequestParam(required = false) String accessorySize,
            @RequestParam(required = false) String color,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) String collection,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "default") String sort) {

        // Multi-sort: split by comma (e.g. "newest,price-asc") and chain Sort criteria in order
        Sort sortOrder = null;
        String[] sortKeys = sort.split(",");
        for (String key : sortKeys) {
            Sort part = buildSortForKey(key.trim());
            sortOrder = (sortOrder == null) ? part : sortOrder.and(part);
        }
        if (sortOrder == null) {
            sortOrder = Sort.by(Sort.Direction.DESC, "id");
        }

        int boundedPageSize = Math.min(Math.max(pageSize, 1), 100);
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), boundedPageSize, sortOrder);

        PaginatedResponseDto<ProductDto> result = productService.getProducts(
                q, targetGroup, gender, productType, category, collection, color, adultSize, kidsSize, accessorySize, minPrice, maxPrice, status, pageable
        );

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /** Maps a single sort key string to a Spring Sort object. */
    private Sort buildSortForKey(String key) {
        return switch (key) {
            case "price-asc"  -> Sort.by(Sort.Direction.ASC,  "price");
            case "price-desc" -> Sort.by(Sort.Direction.DESC, "price");
            case "best-seller", "bestseller", "best" ->
                    Sort.by(Sort.Direction.DESC, "isBestSeller").and(Sort.by(Sort.Direction.DESC, "id"));
            case "discount-desc" ->
                    Sort.by(Sort.Direction.ASC,  "salePrice").and(Sort.by(Sort.Direction.DESC, "price"));
            case "newest" ->
                    Sort.by(Sort.Direction.DESC, "isNew").and(Sort.by(Sort.Direction.DESC, "id"));
            default -> Sort.by(Sort.Direction.DESC, "id");
        };
    }



    @GetMapping("/{slug}")
    public ResponseEntity<ApiResponse<ProductDto>> getProductBySlug(@PathVariable String slug) {
        ProductDto product = productService.getProductBySlug(slug);
        return ResponseEntity.ok(ApiResponse.success(product));
    }

    @GetMapping("/{slug}/similar")
    public ResponseEntity<ApiResponse<List<ProductDto>>> getSimilarProducts(@PathVariable String slug) {
        List<ProductDto> similar = productService.getSimilarProducts(slug);
        return ResponseEntity.ok(ApiResponse.success(similar));
    }

    @GetMapping("/{slug}/outfits")
    public ResponseEntity<ApiResponse<List<ProductDto>>> getOutfits(@PathVariable String slug) {
        List<ProductDto> outfits = productService.getOutfits(slug);
        return ResponseEntity.ok(ApiResponse.success(outfits));
    }

    // San pham goc (ten, mo ta, anh, thuoc tinh, danh muc, thuong hieu) la du
    // lieu DUNG CHUNG: chi ADMIN duoc them/sua/xoa. Truoc day MANAGE_SHOP_PRODUCT
    // (quyen cua SHOP_OWNER) cung goi duoc 3 endpoint nay, nghia la SHOP_OWNER
    // sua/xoa duoc san pham goc cua ca he thong - da bo MANAGE_SHOP_PRODUCT
    // khoi day. MANAGE_SHOP_PRODUCT gio chi con y nghia cho shop_product_configs
    // (gia/ton kho tai chi nhanh), khong con dung o day.
    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_GLOBAL_CATEGORY)")
    @PostMapping
    public ResponseEntity<ApiResponse<ProductDto>> createProduct(@Valid @RequestBody ProductDto productDto) {
        ProductDto createdProduct = productService.createProduct(productDto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Product created successfully", createdProduct));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_GLOBAL_CATEGORY)")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductDto>> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody ProductDto productDto) {
        ProductDto updatedProduct = productService.updateProduct(id, productDto);
        return ResponseEntity.ok(ApiResponse.success("Product updated successfully", updatedProduct));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_GLOBAL_CATEGORY)")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Product deleted successfully", null));
    }
}

