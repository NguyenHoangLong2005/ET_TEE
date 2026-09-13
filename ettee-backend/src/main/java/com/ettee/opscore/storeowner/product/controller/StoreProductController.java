package com.ettee.opscore.storeowner.product.controller;

import com.ettee.opscore.common.dto.ApiResponse;
import com.ettee.opscore.common.dto.PageResponse;
import com.ettee.opscore.security.JwtPrincipal;
import com.ettee.opscore.storeowner.product.dto.*;
import com.ettee.opscore.storeowner.product.entity.ProductStatus;
import com.ettee.opscore.storeowner.product.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Nghiệp vụ "Quản lý mặt hàng, set giá" — permission product.manage / price.manage. */
@RestController
@RequestMapping("/api/store-owner/products")
@RequiredArgsConstructor
public class StoreProductController {

    private final ProductService productService;

    @GetMapping
    @PreAuthorize("hasAuthority('product.manage')")
    public ApiResponse<PageResponse<ProductDto>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) ProductStatus status,
            Pageable pageable
    ) {
        return ApiResponse.ok(productService.search(keyword, categoryId, status, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('product.manage')")
    public ApiResponse<ProductDto> getById(@PathVariable UUID id) {
        return ApiResponse.ok(productService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('product.manage')")
    public ApiResponse<ProductDto> create(@Valid @RequestBody CreateProductRequest request,
                                           @AuthenticationPrincipal JwtPrincipal actor) {
        return ApiResponse.ok(productService.create(request, actor.userId()), "Đã tạo sản phẩm (draft)");
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAuthority('product.manage')")
    public ApiResponse<ProductDto> updateStatus(@PathVariable UUID id, @Valid @RequestBody UpdateProductStatusRequest request) {
        return ApiResponse.ok(productService.updateStatus(id, request.status()), "Đã cập nhật trạng thái sản phẩm");
    }

    @PostMapping("/{id}/variants")
    @PreAuthorize("hasAuthority('product.manage')")
    public ApiResponse<ProductVariantDto> addVariant(@PathVariable UUID id, @Valid @RequestBody CreateVariantRequest request) {
        return ApiResponse.ok(productService.addVariant(id, request), "Đã thêm biến thể");
    }

    @PutMapping("/variants/{variantId}/price")
    @PreAuthorize("hasAuthority('price.manage')")
    public ApiResponse<ProductVariantDto> updatePrice(@PathVariable UUID variantId, @Valid @RequestBody UpdateVariantPriceRequest request) {
        return ApiResponse.ok(productService.updateVariantPrice(variantId, request), "Đã cập nhật giá");
    }

    @PutMapping("/variants/{variantId}/active")
    @PreAuthorize("hasAuthority('product.manage')")
    public ApiResponse<ProductVariantDto> setActive(@PathVariable UUID variantId, @RequestParam boolean active) {
        return ApiResponse.ok(productService.setVariantActive(variantId, active), "Đã cập nhật trạng thái biến thể");
    }
}
