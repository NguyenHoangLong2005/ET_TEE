package com.ettee.opscore.storeowner.product.service;

import com.ettee.opscore.common.dto.PageResponse;
import com.ettee.opscore.common.exception.AppExceptions;
import com.ettee.opscore.storeowner.product.dto.*;
import com.ettee.opscore.storeowner.product.entity.Product;
import com.ettee.opscore.storeowner.product.entity.ProductStatus;
import com.ettee.opscore.storeowner.product.entity.ProductVariant;
import com.ettee.opscore.storeowner.product.repository.ProductRepository;
import com.ettee.opscore.storeowner.product.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;

    @Transactional(readOnly = true)
    public PageResponse<ProductDto> search(String keyword, UUID categoryId, ProductStatus status, Pageable pageable) {
        return PageResponse.from(productRepository
                .search(keyword, categoryId, status == null ? null : status.name(), pageable).map(this::toDto));
    }

    @Transactional(readOnly = true)
    public ProductDto getById(UUID id) {
        return toDto(findProduct(id));
    }

    private Product findProduct(UUID id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Sản phẩm", id));
    }

    @Transactional
    public ProductDto create(CreateProductRequest request, UUID actorId) {
        if (productRepository.existsBySlug(request.slug())) {
            throw new AppExceptions.BusinessRuleViolationException("Slug đã tồn tại: " + request.slug());
        }
        Product p = new Product();
        p.setCategoryId(request.categoryId());
        p.setName(request.name());
        p.setSlug(request.slug());
        p.setDescription(request.description());
        p.setBrand(request.brand());
        p.setGenderTarget(request.genderTarget());
        p.setBasePrice(request.basePrice());
        p.setStatus(ProductStatus.draft);
        p.setCreatedBy(actorId);
        return toDto(productRepository.save(p));
    }

    @Transactional
    public ProductDto updateStatus(UUID productId, ProductStatus status) {
        Product p = findProduct(productId);
        if (status == ProductStatus.active && p.getVariants().stream().noneMatch(ProductVariant::isActive)) {
            throw new AppExceptions.BusinessRuleViolationException(
                    "Sản phẩm cần ít nhất 1 biến thể (variant) đang active trước khi publish");
        }
        p.setStatus(status);
        return toDto(productRepository.save(p));
    }

    @Transactional
    public ProductVariantDto addVariant(UUID productId, CreateVariantRequest request) {
        Product p = findProduct(productId);
        if (variantRepository.existsBySku(request.sku())) {
            throw new AppExceptions.BusinessRuleViolationException("SKU đã tồn tại: " + request.sku());
        }
        ProductVariant v = new ProductVariant();
        v.setProduct(p);
        v.setSku(request.sku());
        v.setPrice(request.price());
        v.setCompareAtPrice(request.compareAtPrice());
        v.setWeightGrams(request.weightGrams());
        v.setBarcode(request.barcode());
        v.setAttributeSignature(request.attributeSignature());
        // Theo CHECK constraint của schema: chỉ active được khi đã có
        // attribute_signature.
        v.setActive(request.attributeSignature() != null);
        return toVariantDto(variantRepository.save(v));
    }

    @Transactional
    public ProductVariantDto updateVariantPrice(UUID variantId, UpdateVariantPriceRequest request) {
        ProductVariant v = variantRepository.findById(variantId)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Biến thể sản phẩm", variantId));
        v.setPrice(request.price());
        v.setCompareAtPrice(request.compareAtPrice());
        return toVariantDto(variantRepository.save(v));
    }

    @Transactional
    public ProductVariantDto setVariantActive(UUID variantId, boolean active) {
        ProductVariant v = variantRepository.findById(variantId)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Biến thể sản phẩm", variantId));
        if (active && v.getAttributeSignature() == null) {
            throw new AppExceptions.BusinessRuleViolationException(
                    "Biến thể cần khai báo thuộc tính (size/màu...) trước khi kích hoạt bán");
        }
        v.setActive(active);
        return toVariantDto(variantRepository.save(v));
    }

    private ProductDto toDto(Product p) {
        List<ProductVariantDto> variants = p.getVariants().stream().map(this::toVariantDto).toList();
        return new ProductDto(p.getId(), p.getCategoryId(), p.getName(), p.getSlug(), p.getDescription(),
                p.getBrand(), p.getGenderTarget(), p.getBasePrice(), p.getStatus(), p.isRepeatPurchase(),
                variants, p.getCreatedAt(), p.getUpdatedAt());
    }

    private ProductVariantDto toVariantDto(ProductVariant v) {
        return new ProductVariantDto(v.getId(), v.getSku(), v.getPrice(), v.getCompareAtPrice(),
                v.getWeightGrams(), v.getBarcode(), v.isActive(), v.getAttributeSignature());
    }
}
