package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.CategoryDto;
import com.nguyenhoanglong.dto.ProductDto;
import com.nguyenhoanglong.dto.ProductVariantDto;
import com.nguyenhoanglong.entity.Category;
import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.entity.ProductVariant;
import com.nguyenhoanglong.exception.ResourceNotFoundException;
import com.nguyenhoanglong.repository.CategoryRepository;
import com.nguyenhoanglong.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
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
    public List<ProductDto> getAllProducts() {
        return productRepository.findAllWithDetails().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ProductDto getProductById(Long id) {
        Product product = productRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        return mapToDto(product);
    }

    @Override
    public ProductDto createProduct(ProductDto productDto) {
        Product product = new Product();
        product.setName(productDto.getName());
        product.setDescription(productDto.getDescription());
        product.setBrand(productDto.getBrand());
        product.setPrice(productDto.getPrice());
        product.setGender(productDto.getGender());
        product.setMaterial(productDto.getMaterial());
        product.setStyle(productDto.getStyle());

        // Category association
        Long catId = productDto.getCategoryId();
        if (catId == null && productDto.getCategory() != null) {
            catId = productDto.getCategory().getId();
        }
        if (catId != null) {
            final Long targetCatId = catId;
            Category category = categoryRepository.findById(targetCatId)
                    .orElseThrow(() -> new ResourceNotFoundException("Category", "id", targetCatId));
            product.setCategory(category);
        }

        // Variants association
        if (productDto.getVariants() != null && !productDto.getVariants().isEmpty()) {
            for (ProductVariantDto vDto : productDto.getVariants()) {
                ProductVariant variant = ProductVariant.builder()
                        .sku(vDto.getSku())
                        .color(vDto.getColor())
                        .size(vDto.getSize())
                        .price(vDto.getPrice() != null ? vDto.getPrice() : productDto.getPrice())
                        .stock(vDto.getStock() != null ? vDto.getStock() : 0)
                        .build();
                product.addVariant(variant);
            }
        }

        Product savedProduct = productRepository.save(product);
        return mapToDto(savedProduct);
    }

    @Override
    public ProductDto updateProduct(Long id, ProductDto productDto) {
        Product existingProduct = productRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));

        existingProduct.setName(productDto.getName());
        existingProduct.setDescription(productDto.getDescription());
        existingProduct.setBrand(productDto.getBrand());
        existingProduct.setPrice(productDto.getPrice());
        existingProduct.setGender(productDto.getGender());
        existingProduct.setMaterial(productDto.getMaterial());
        existingProduct.setStyle(productDto.getStyle());

        // Update category if provided
        Long catId = productDto.getCategoryId();
        if (catId == null && productDto.getCategory() != null) {
            catId = productDto.getCategory().getId();
        }
        if (catId != null) {
            final Long targetCatId = catId;
            Category category = categoryRepository.findById(targetCatId)
                    .orElseThrow(() -> new ResourceNotFoundException("Category", "id", targetCatId));
            existingProduct.setCategory(category);
        }

        // Update variants if provided
        if (productDto.getVariants() != null) {
            existingProduct.getVariants().clear();
            for (ProductVariantDto vDto : productDto.getVariants()) {
                ProductVariant variant = ProductVariant.builder()
                        .sku(vDto.getSku())
                        .color(vDto.getColor())
                        .size(vDto.getSize())
                        .price(vDto.getPrice() != null ? vDto.getPrice() : productDto.getPrice())
                        .stock(vDto.getStock() != null ? vDto.getStock() : 0)
                        .build();
                existingProduct.addVariant(variant);
            }
        }

        Product updatedProduct = productRepository.save(existingProduct);
        return mapToDto(updatedProduct);
    }

    @Override
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        productRepository.delete(product);
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
                            .size(v.getSize())
                            .price(v.getPrice())
                            .stock(v.getStock())
                            .build())
                    .collect(Collectors.toList());
        }

        return ProductDto.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .brand(product.getBrand())
                .price(product.getPrice())
                .category(categoryDto)
                .categoryId(categoryDto != null ? categoryDto.getId() : null)
                .gender(product.getGender())
                .material(product.getMaterial())
                .style(product.getStyle())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .variants(variantDtos)
                .build();
    }
}
