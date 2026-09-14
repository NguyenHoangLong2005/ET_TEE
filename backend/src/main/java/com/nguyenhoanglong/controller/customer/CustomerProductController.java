package com.nguyenhoanglong.controller.customer;

import com.nguyenhoanglong.dto.ApiResponse;
import com.nguyenhoanglong.dto.ProductDto;
import com.nguyenhoanglong.service.ProductService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.nguyenhoanglong.dto.PaginatedResponseDto;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@RestController
@RequestMapping("/api/customer/products")
public class CustomerProductController {

    private final ProductService productService;

    public CustomerProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<com.nguyenhoanglong.dto.PaginatedResponseDto<ProductDto>>> getAllProductsForCustomer() {
        PaginatedResponseDto<ProductDto> result = productService.getProducts(
                null, null, null, null, null, null, null, null, null, null, null, null,
                PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductDto>> getProductDetailForCustomer(@PathVariable Long id) {
        ProductDto product = productService.getProductById(id);
        return ResponseEntity.ok(ApiResponse.success(product));
    }
}
