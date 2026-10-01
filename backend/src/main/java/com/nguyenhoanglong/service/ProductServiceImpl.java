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
    private final com.nguyenhoanglong.repository.ProductVariantRepository variantRepository;
    private final org.springframework.transaction.support.TransactionTemplate readOnlyTx;
    private final CategoryRepository categoryRepository;

    public ProductServiceImpl(ProductRepository productRepository, CategoryRepository categoryRepository,
                              com.nguyenhoanglong.repository.ProductVariantRepository variantRepository,
                              org.springframework.transaction.PlatformTransactionManager txManager) {
        this.variantRepository = variantRepository;
        this.readOnlyTx = new org.springframework.transaction.support.TransactionTemplate(txManager);
        this.readOnlyTx.setReadOnly(true);
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
    }

    // The DB is remote, so every listing costs several network round-trips.
    // Short-lived cache; cleared on product create/update/delete.
    private static final com.nguyenhoanglong.util.TtlCache<String, PaginatedResponseDto<ProductDto>> LISTING_CACHE =
            new com.nguyenhoanglong.util.TtlCache<>(30, 1800, 200);

    /** For code outside this service that changes what the storefront shows (e.g. price edits by the store owner). */
    public static void invalidateListingCache() {
        LISTING_CACHE.clear();
    }

    @Override
    public PaginatedResponseDto<ProductDto> getProducts(
            String q, String targetGroup, String gender, String productType, String category, String collection,
            String color, String adultSize, String kidsSize, String accessorySize,
            BigDecimal minPrice, BigDecimal maxPrice, String status, Pageable pageable) {
        String key = java.util.Arrays.asList(q, targetGroup, gender, productType, category, collection, color,
                adultSize, kidsSize, accessorySize, minPrice, maxPrice, status, pageable).toString();
        return LISTING_CACHE.get(key, () -> readOnlyTx.execute(status_ -> loadProducts(q, targetGroup, gender,
                productType, category, collection, color, adultSize, kidsSize, accessorySize, minPrice, maxPrice,
                status, pageable)));
    }

    private PaginatedResponseDto<ProductDto> loadProducts(
            String q, String targetGroup, String gender, String productType, String category, String collection,
            String color, String adultSize, String kidsSize, String accessorySize,
            BigDecimal minPrice, BigDecimal maxPrice, String status, Pageable pageable) {

        Specification<Product> spec = ProductSpecification.filter(
                q, targetGroup, gender, productType, category, collection, color, adultSize, kidsSize, accessorySize, minPrice, maxPrice, status
        );

        Page<Product> page = productRepository.findAll(spec, pageable);
        List<ProductDto> items = page.getContent().stream()
                .map(product -> mapToDto(product, false))
                .collect(Collectors.toList());
        attachVariantSummaries(items);

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
                .filter(p -> "ACTIVE".equals(p.getStatus()))
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        return mapToDto(product);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductDto getProductBySlug(String slug) {
        Product product = productRepository.findBySlug(slug)
                .filter(p -> "ACTIVE".equals(p.getStatus()))
                .orElseThrow(() -> new ResourceNotFoundException("Product", "slug", slug));
        return mapToDto(product);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductDto> getSimilarProducts(String slug) {
        Product product = productRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "slug", slug));

        if (product.getProductType() == null) {
            return List.of();
        }

        // Simple rule based recommendation
        List<Product> similar = productRepository.findSimilarActive(
                product.getProductType(), product.getId(), org.springframework.data.domain.PageRequest.of(0, 4));

        return similar.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductDto> getOutfits(String slug) {
        Product product = productRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "slug", slug));

        if (product.getTargetGroup() == null) {
            return List.of();
        }

        // Simple rule based outfit recommendation
        List<Product> outfits = productRepository.findOutfitCandidates(
                product.getTargetGroup(), product.getProductType(), product.getId(),
                org.springframework.data.domain.PageRequest.of(0, 4));

        return outfits.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Override
    public ProductDto createProduct(ProductDto productDto) {
        LISTING_CACHE.clear();
        Product product = new Product();
        applyDtoToProduct(productDto, product);
        Product saved = productRepository.save(product);
        return mapToDto(saved);
    }

    @Override
    public ProductDto updateProduct(Long id, ProductDto productDto) {
        LISTING_CACHE.clear();
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
        // Derived from the prices, like the store owner's pricing does: a client-set flag drifted
        // (511 products flagged "on sale", many with no discount at all).
        product.setIsSale(product.getSalePrice() != null && product.getPrice() != null
                && product.getSalePrice().compareTo(product.getPrice()) < 0);

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
        LISTING_CACHE.clear();
        // Xoa mem: doi status='DELETED' thay vi deleteById. Product da co
        // @SQLRestriction("status <> 'DELETED'") nen san pham nay tu dong bien
        // mat khoi moi truy van sau khi doi status - don hang/phieu nhap cu
        // van con tham chieu duoc toi no.
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với id: " + id));
        // Same rules as the store owner's delete, which this admin path used to skip.
        productRemovalService.assertNoOpenOrders(id);
        String suffix = "-deleted-" + product.getId();
        String slug = product.getSlug();
        if (slug != null && !slug.endsWith(suffix)) {
            product.setSlug(slug.length() + suffix.length() > 255 ? slug.substring(0, 255 - suffix.length()) + suffix : slug + suffix);
        }
        product.setStatus("DELETED");
        productRepository.save(product);
        productRemovalService.detachFromCartsAndWishlists(id);
    }

    @org.springframework.beans.factory.annotation.Autowired
    private ProductRemovalService productRemovalService;

    /**
     * Fills each listing item's variants with distinct color-only and size-only entries
     * (all a product card needs) using two small grouped queries instead of loading
     * every variant row.
     */
    private void attachVariantSummaries(List<ProductDto> items) {
        if (items.isEmpty()) return;
        List<Long> ids = items.stream().map(ProductDto::getId).collect(Collectors.toList());
        Map<Long, List<ProductVariantDto>> byProduct = new HashMap<>();
        for (Object[] row : variantRepository.findDistinctColorsByProductIds(ids)) {
            byProduct.computeIfAbsent((Long) row[0], k -> new ArrayList<>()).add(ProductVariantDto.builder()
                    .color((String) row[1]).colorHex((String) row[2]).colorCode((String) row[3]).build());
        }
        for (Object[] row : variantRepository.findDistinctSizesByProductIds(ids)) {
            byProduct.computeIfAbsent((Long) row[0], k -> new ArrayList<>()).add(ProductVariantDto.builder()
                    .size((String) row[1]).build());
        }
        for (ProductDto item : items) {
            item.setVariants(byProduct.getOrDefault(item.getId(), new ArrayList<>()));
        }
    }

    private ProductDto mapToDto(Product product) {
        return mapToDto(product, true);
    }

    private ProductDto mapToDto(Product product, boolean includeVariants) {
        CategoryDto categoryDto = null;
        if (product.getCategory() != null) {
            categoryDto = CategoryDto.builder()
                    .id(product.getCategory().getId())
                    .name(product.getCategory().getName())
                    .description(product.getCategory().getDescription())
                    .build();
        }

        List<ProductVariantDto> variantDtos = new ArrayList<>();
        if (includeVariants && product.getVariants() != null) {
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
