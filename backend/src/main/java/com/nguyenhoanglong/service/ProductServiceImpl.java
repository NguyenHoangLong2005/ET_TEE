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
            BigDecimal minPrice, BigDecimal maxPrice, String status, Pageable pageable) {

        Specification<Product> spec = ProductSpecification.filter(
                q, targetGroup, gender, productType, category, collection, color, adultSize, kidsSize, accessorySize, minPrice, maxPrice, status
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
        Product product = new Product();
        applyDtoToProduct(productDto, product);
        Product saved = productRepository.save(product);
        return mapToDto(saved);
    }

    @Override
    public ProductDto updateProduct(Long id, ProductDto productDto) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với id: " + id));
        applyDtoToProduct(productDto, product);
        Product saved = productRepository.save(product);
        return mapToDto(saved);
    }

    private void applyDtoToProduct(ProductDto dto, Product product) {
        if (dto.getName() != null) product.setName(dto.getName());
        if (dto.getSlug() != null) product.setSlug(dto.getSlug());
        if (dto.getDescription() != null) product.setDescription(dto.getDescription());
        if (dto.getBrand() != null) product.setBrand(dto.getBrand());
        if (dto.getPrice() != null) product.setPrice(dto.getPrice());
        if (dto.getSalePrice() != null) product.setSalePrice(dto.getSalePrice());
        if (dto.getGender() != null) product.setGender(dto.getGender());
        if (dto.getTargetGroup() != null) product.setTargetGroup(dto.getTargetGroup());
        if (dto.getProductType() != null) product.setProductType(dto.getProductType());
        if (dto.getMaterial() != null) product.setMaterial(dto.getMaterial());
        if (dto.getStyle() != null) product.setStyle(dto.getStyle());
        product.setStatus(dto.getStatus() != null ? dto.getStatus() : "ACTIVE");
        if (dto.getIsNew() != null) product.setIsNew(dto.getIsNew());
        if (dto.getIsBestSeller() != null) product.setIsBestSeller(dto.getIsBestSeller());
        if (dto.getIsSale() != null) product.setIsSale(dto.getIsSale());

        Long categoryId = dto.getCategoryId() != null ? dto.getCategoryId()
                : (dto.getCategory() != null ? dto.getCategory().getId() : null);
        if (categoryId != null) {
            Category category = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với id: " + categoryId));
            product.setCategory(category);
        }

        if (dto.getStyleTags() != null) product.setStyleTags(new ArrayList<>(dto.getStyleTags()));
        if (dto.getRecommendationTags() != null) product.setRecommendationTags(new ArrayList<>(dto.getRecommendationTags()));

        if (dto.getVariants() != null) {
            product.getVariants().clear();
            for (ProductVariantDto vDto : dto.getVariants()) {
                ProductVariant variant = new ProductVariant();
                variant.setSku(vDto.getSku());
                variant.setColor(vDto.getColor());
                variant.setColorHex(vDto.getColorHex());
                variant.setColorCode(vDto.getColorCode());
                variant.setSize(vDto.getSize());
                variant.setPrice(vDto.getPrice() != null ? vDto.getPrice() : product.getPrice());
                variant.setSalePrice(vDto.getSalePrice() != null ? vDto.getSalePrice() : product.getSalePrice());
                variant.setStock(vDto.getStock() != null ? vDto.getStock() : 0);
                variant.setAvailableQuantity(vDto.getAvailableQuantity() != null ? vDto.getAvailableQuantity() : variant.getStock());
                product.addVariant(variant);
            }
        }

        if (dto.getImages() != null) {
            product.getImages().clear();
            for (Map<String, Object> imgMap : dto.getImages()) {
                com.nguyenhoanglong.entity.ProductImage img = new com.nguyenhoanglong.entity.ProductImage();
                img.setImageUrl((String) imgMap.get("imageUrl"));
                img.setAlt((String) imgMap.getOrDefault("alt", ""));
                Object isPrimary = imgMap.get("isPrimary");
                img.setIsPrimary(isPrimary instanceof Boolean ? (Boolean) isPrimary : Boolean.FALSE);
                Object sortOrder = imgMap.get("sortOrder");
                img.setSortOrder(sortOrder instanceof Number ? ((Number) sortOrder).intValue() : 0);
                img.setColorCode((String) imgMap.get("colorCode"));
                img.setColorHex((String) imgMap.get("colorHex"));
                product.addImage(img);
            }
        }
    }

    @Override
    public void deleteProduct(Long id) {
        // Xoa mem: doi status='DELETED' thay vi deleteById. Product da co
        // @SQLRestriction("status <> 'DELETED'") nen san pham nay tu dong bien
        // mat khoi moi truy van sau khi doi status - don hang/phieu nhap cu
        // van con tham chieu duoc toi no.
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với id: " + id));
        product.setStatus("DELETED");
        productRepository.save(product);
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
                            .colorCode(v.getColorCode())
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
                imgDto.put("colorCode", img.getColorCode());
                imgDto.put("colorHex", img.getColorHex());
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
                .averageRating(product.getAverageRating() != null ? Math.round(product.getAverageRating() * 10.0) / 10.0 : 0.0)
                .totalReviews(product.getTotalReviews() != null ? product.getTotalReviews() : 0)
                .soldCount(product.getSoldCount() != null ? product.getSoldCount() : 0)
                .build();
                
        return dto;
    }
}
