package com.ettee.opscore.storeowner.product.controller;

import com.ettee.opscore.common.dto.ApiResponse;
import com.ettee.opscore.common.dto.PageResponse;
import com.ettee.opscore.common.exception.AppExceptions;
import com.ettee.opscore.storeowner.product.dto.ProductDto;
import com.ettee.opscore.storeowner.product.entity.ProductStatus;
import com.ettee.opscore.storeowner.product.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PublicProductController {

    private final ProductService productService;

    @GetMapping("/products")
    public ApiResponse<PageResponse<ProductDto>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) UUID categoryId,
            Pageable pageable) {
        return ApiResponse.ok(productService.search(keyword, categoryId, ProductStatus.active, pageable));
    }

    @GetMapping("/products/{id}")
    public ApiResponse<ProductDto> getById(@PathVariable UUID id) {
        ProductDto product = productService.getById(id);
        if (product.status() != ProductStatus.active) {
            throw new AppExceptions.ResourceNotFoundException("Sản phẩm", id);
        }
        return ApiResponse.ok(product);
    }
}
