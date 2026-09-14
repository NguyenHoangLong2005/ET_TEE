package com.nguyenhoanglong.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class ProductDto {
    private Long id;
    private String name;
    private String slug;
    private String description;
    private String brand;
    private BigDecimal price;
    private BigDecimal salePrice;
    private CategoryDto category;
    private Long categoryId;
    private String gender;
    private String targetGroup;
    private String productType;
    private String material;
    private String style;
    private String status;
    private Boolean isNew;
    private Boolean isBestSeller;
    private Boolean isSale;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<String> styleTags = new ArrayList<>();
    private List<String> recommendationTags = new ArrayList<>();
    private List<ProductVariantDto> variants = new ArrayList<>();
    private List<Map<String, Object>> images = new ArrayList<>();

    public ProductDto() {}

    // Very basic Getters and Setters for everything
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public BigDecimal getSalePrice() { return salePrice; }
    public void setSalePrice(BigDecimal salePrice) { this.salePrice = salePrice; }
    public CategoryDto getCategory() { return category; }
    public void setCategory(CategoryDto category) { this.category = category; }
    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public String getTargetGroup() { return targetGroup; }
    public void setTargetGroup(String targetGroup) { this.targetGroup = targetGroup; }
    public String getProductType() { return productType; }
    public void setProductType(String productType) { this.productType = productType; }
    public String getMaterial() { return material; }
    public void setMaterial(String material) { this.material = material; }
    public String getStyle() { return style; }
    public void setStyle(String style) { this.style = style; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Boolean getIsNew() { return isNew; }
    public void setIsNew(Boolean isNew) { this.isNew = isNew; }
    public Boolean getIsBestSeller() { return isBestSeller; }
    public void setIsBestSeller(Boolean isBestSeller) { this.isBestSeller = isBestSeller; }
    public Boolean getIsSale() { return isSale; }
    public void setIsSale(Boolean isSale) { this.isSale = isSale; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public List<String> getStyleTags() { return styleTags; }
    public void setStyleTags(List<String> styleTags) { this.styleTags = styleTags; }
    public List<String> getRecommendationTags() { return recommendationTags; }
    public void setRecommendationTags(List<String> recommendationTags) { this.recommendationTags = recommendationTags; }
    public List<ProductVariantDto> getVariants() { return variants; }
    public void setVariants(List<ProductVariantDto> variants) { this.variants = variants; }
    public List<Map<String, Object>> getImages() { return images; }
    public void setImages(List<Map<String, Object>> images) { this.images = images; }

    public static ProductDtoBuilder builder() {
        return new ProductDtoBuilder();
    }
    
    public static class ProductDtoBuilder {
        private ProductDto dto = new ProductDto();
        
        public ProductDtoBuilder id(Long id) { dto.setId(id); return this; }
        public ProductDtoBuilder name(String name) { dto.setName(name); return this; }
        public ProductDtoBuilder slug(String slug) { dto.setSlug(slug); return this; }
        public ProductDtoBuilder description(String description) { dto.setDescription(description); return this; }
        public ProductDtoBuilder brand(String brand) { dto.setBrand(brand); return this; }
        public ProductDtoBuilder price(BigDecimal price) { dto.setPrice(price); return this; }
        public ProductDtoBuilder salePrice(BigDecimal salePrice) { dto.setSalePrice(salePrice); return this; }
        public ProductDtoBuilder category(CategoryDto category) { dto.setCategory(category); return this; }
        public ProductDtoBuilder categoryId(Long categoryId) { dto.setCategoryId(categoryId); return this; }
        public ProductDtoBuilder gender(String gender) { dto.setGender(gender); return this; }
        public ProductDtoBuilder targetGroup(String targetGroup) { dto.setTargetGroup(targetGroup); return this; }
        public ProductDtoBuilder productType(String productType) { dto.setProductType(productType); return this; }
        public ProductDtoBuilder material(String material) { dto.setMaterial(material); return this; }
        public ProductDtoBuilder style(String style) { dto.setStyle(style); return this; }
        public ProductDtoBuilder status(String status) { dto.setStatus(status); return this; }
        public ProductDtoBuilder isNew(Boolean isNew) { dto.setIsNew(isNew); return this; }
        public ProductDtoBuilder isBestSeller(Boolean isBestSeller) { dto.setIsBestSeller(isBestSeller); return this; }
        public ProductDtoBuilder isSale(Boolean isSale) { dto.setIsSale(isSale); return this; }
        public ProductDtoBuilder createdAt(LocalDateTime createdAt) { dto.setCreatedAt(createdAt); return this; }
        public ProductDtoBuilder updatedAt(LocalDateTime updatedAt) { dto.setUpdatedAt(updatedAt); return this; }
        public ProductDtoBuilder styleTags(List<String> styleTags) { dto.setStyleTags(styleTags); return this; }
        public ProductDtoBuilder recommendationTags(List<String> recommendationTags) { dto.setRecommendationTags(recommendationTags); return this; }
        public ProductDtoBuilder variants(List<ProductVariantDto> variants) { dto.setVariants(variants); return this; }
        public ProductDtoBuilder images(List<Map<String, Object>> images) { dto.setImages(images); return this; }

        public ProductDto build() { return dto; }
    }
}
