package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.CategoryDto;
import com.nguyenhoanglong.dto.PaginatedResponseDto;
import com.nguyenhoanglong.dto.ProductDto;
import com.nguyenhoanglong.dto.ProductVariantDto;
import com.nguyenhoanglong.entity.Category;
import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.entity.ProductVariant;
import com.nguyenhoanglong.exception.ResourceNotFoundException;
import com.nguyenhoanglong.repository.CategoryRepository;
import com.nguyenhoanglong.repository.ProductRepository;
import com.nguyenhoanglong.repository.ProductSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    public ProductServiceImpl(ProductRepository productRepository, CategoryRepository categoryRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PaginatedResponseDto<ProductDto> getProducts(
            String q, String targetGroup, String gender, String productType, String category, String collection,
            String color, String adultSize, String kidsSize, String accessorySize,
            BigDecimal minPrice, BigDecimal maxPrice, Pageable pageable) {

        Specification<Product> spec = ProductSpecification.filter(
                q, targetGroup, gender, productType, category, collection, color, adultSize, kidsSize, accessorySize, minPrice, maxPrice
        );

        Page<Product> page = productRepository.findAll(spec, pageable);
        List<ProductDto> items = page.getContent().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());

        Map<String, Object> filters = new HashMap<>();
        // Could populate real filters here
        filters.put("colors", List.of("Đen", "Trắng", "Xanh navy", "Be", "Xám"));

        return new PaginatedResponseDto<>(
                items,
                page.getTotalElements(),
                page.getNumber() + 1,
                page.getSize(),
                page.getTotalPages(),
                filters
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ProductDto getProductById(Long id) {
        Product product = productRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        return mapToDto(product);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductDto getProductBySlug(String slug) {
        Product product = productRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "slug", slug));
        return mapToDto(product);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductDto> getSimilarProducts(String slug) {
        Product product = productRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "slug", slug));
        
        // Simple rule based recommendation
        List<Product> similar = productRepository.findAll().stream()
                .filter(p -> p.getProductType() != null && p.getProductType().equals(product.getProductType()) 
                        && !p.getId().equals(product.getId()))
                .limit(4)
                .collect(Collectors.toList());
        
        return similar.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductDto> getOutfits(String slug) {
        Product product = productRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "slug", slug));
        
        // Simple rule based outfit recommendation
        List<Product> outfits = productRepository.findAll().stream()
                .filter(p -> p.getTargetGroup() != null && p.getTargetGroup().equals(product.getTargetGroup()) 
                        && !p.getId().equals(product.getId())
                        && (p.getProductType() == null || !p.getProductType().equals(product.getProductType())))
                .limit(4)
                .collect(Collectors.toList());

        return outfits.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Override
    public ProductDto createProduct(ProductDto productDto) {
        // Basic impl for now
        return null;
    }

    @Override
    public ProductDto updateProduct(Long id, ProductDto productDto) {
        // Basic impl for now
        return null;
    }

    @Override
    public void deleteProduct(Long id) {
        productRepository.deleteById(id);
    }

    private ProductDto mapToDto(Product product) {
        CategoryDto categoryDto = null;
        if (product.getCategory() != null) {
            categoryDto = CategoryDto.builder()
                    .id(product.getCategory().getId())
                    .name(product.getCategory().getName())
                    .description(product.getCategory().getDescription())
                    .build();
        }

        List<ProductVariantDto> variantDtos = new ArrayList<>();
        if (product.getVariants() != null) {
            variantDtos = product.getVariants().stream()
                    .map(v -> ProductVariantDto.builder()
                            .id(v.getId())
                            .sku(v.getSku())
                            .color(v.getColor())
                            .colorHex(v.getColorHex())
                            .size(v.getSize())
                            .price(v.getPrice())
                            .salePrice(v.getSalePrice())
                            .stock(v.getStock())
                            .availableQuantity(v.getAvailableQuantity())
                            .build())
                    .collect(Collectors.toList());
        }

        List<Map<String, Object>> imageDtos = new ArrayList<>();
        if (product.getImages() != null) {
            for (com.nguyenhoanglong.entity.ProductImage img : product.getImages()) {
                Map<String, Object> imgDto = new HashMap<>();
                imgDto.put("imageUrl", img.getImageUrl());
                imgDto.put("alt", img.getAlt());
                imgDto.put("isPrimary", img.getIsPrimary());
                imgDto.put("sortOrder", img.getSortOrder());
                imageDtos.add(imgDto);
            }
        }

        ProductDto dto = ProductDto.builder()
                .id(product.getId())
                .name(product.getName())
                .slug(product.getSlug())
                .description(product.getDescription())
                .brand(product.getBrand())
                .price(product.getPrice())
                .salePrice(product.getSalePrice())
                .category(categoryDto)
                .categoryId(categoryDto != null ? categoryDto.getId() : null)
                .gender(product.getGender())
                .targetGroup(product.getTargetGroup())
                .productType(product.getProductType())
                .material(product.getMaterial())
                .style(product.getStyle())
                .status(product.getStatus())
                .isNew(product.getIsNew())
                .isBestSeller(product.getIsBestSeller())
                .isSale(product.getIsSale())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .styleTags(product.getStyleTags() != null ? product.getStyleTags() : new ArrayList<>())
                .recommendationTags(product.getRecommendationTags() != null ? product.getRecommendationTags() : new ArrayList<>())
                .variants(variantDtos)
                .images(imageDtos)
                .build();
                
        return dto;
    }
}
