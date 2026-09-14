package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.ProductDto;

import java.util.List;

import com.nguyenhoanglong.dto.PaginatedResponseDto;
import org.springframework.data.domain.Pageable;
import java.math.BigDecimal;

public interface ProductService {
    PaginatedResponseDto<ProductDto> getProducts(
            String q, String targetGroup, String gender, String productType, String category, String collection,
            String color, String adultSize, String kidsSize, String accessorySize,
            BigDecimal minPrice, BigDecimal maxPrice, Pageable pageable);

    ProductDto getProductById(Long id);
    ProductDto getProductBySlug(String slug);
    
    List<ProductDto> getSimilarProducts(String slug);
    List<ProductDto> getOutfits(String slug);

    ProductDto createProduct(ProductDto productDto);
    ProductDto updateProduct(Long id, ProductDto productDto);
    void deleteProduct(Long id);
}
