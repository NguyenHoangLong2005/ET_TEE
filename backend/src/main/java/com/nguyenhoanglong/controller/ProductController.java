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
            @RequestParam(defaultValue = "newest") String sort) {

        Sort sortOrder = Sort.by(Sort.Direction.DESC, "createdAt");
        if ("price-asc".equals(sort)) {
            sortOrder = Sort.by(Sort.Direction.ASC, "price");
        } else if ("price-desc".equals(sort)) {
            sortOrder = Sort.by(Sort.Direction.DESC, "price");
        } else if ("best-seller".equals(sort)) {
            // Ideally sort by sales count, using id for mock
            sortOrder = Sort.by(Sort.Direction.DESC, "id");
        }

        Pageable pageable = PageRequest.of(Math.max(0, page - 1), pageSize, sortOrder);

        PaginatedResponseDto<ProductDto> result = productService.getProducts(
                q, targetGroup, gender, productType, category, collection, color, adultSize, kidsSize, accessorySize, minPrice, maxPrice, pageable
        );

        return ResponseEntity.ok(ApiResponse.success(result));
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

    @PostMapping
    public ResponseEntity<ApiResponse<ProductDto>> createProduct(@Valid @RequestBody ProductDto productDto) {
        ProductDto createdProduct = productService.createProduct(productDto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Product created successfully", createdProduct));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductDto>> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody ProductDto productDto) {
        ProductDto updatedProduct = productService.updateProduct(id, productDto);
        return ResponseEntity.ok(ApiResponse.success("Product updated successfully", updatedProduct));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Product deleted successfully", null));
    }
}
