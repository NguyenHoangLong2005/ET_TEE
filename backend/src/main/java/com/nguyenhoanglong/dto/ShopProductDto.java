package com.nguyenhoanglong.dto;

import java.math.BigDecimal;

public class ShopProductDto {
    private Long id;
    private String name;
    private String slug;
    private String categoryName;
    private String brand;
    private BigDecimal basePrice;
    private BigDecimal baseSalePrice;
    private BigDecimal localPrice;
    private BigDecimal localPromoPrice;
    private Boolean isAvailableForSale;
    private String status;
    private String imageUrl;

    public ShopProductDto() {}

    public ShopProductDto(Long id, String name, String slug, String categoryName, String brand,
                          BigDecimal basePrice, BigDecimal baseSalePrice, BigDecimal localPrice,
                          BigDecimal localPromoPrice, Boolean isAvailableForSale, String status, String imageUrl) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.categoryName = categoryName;
        this.brand = brand;
        this.basePrice = basePrice;
        this.baseSalePrice = baseSalePrice;
        this.localPrice = localPrice;
        this.localPromoPrice = localPromoPrice;
        this.isAvailableForSale = isAvailableForSale;
        this.status = status;
        this.imageUrl = imageUrl;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private String name;
        private String slug;
        private String categoryName;
        private String brand;
        private BigDecimal basePrice;
        private BigDecimal baseSalePrice;
        private BigDecimal localPrice;
        private BigDecimal localPromoPrice;
        private Boolean isAvailableForSale;
        private String status;
        private String imageUrl;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder slug(String slug) { this.slug = slug; return this; }
        public Builder categoryName(String categoryName) { this.categoryName = categoryName; return this; }
        public Builder brand(String brand) { this.brand = brand; return this; }
        public Builder basePrice(BigDecimal basePrice) { this.basePrice = basePrice; return this; }
        public Builder baseSalePrice(BigDecimal baseSalePrice) { this.baseSalePrice = baseSalePrice; return this; }
        public Builder localPrice(BigDecimal localPrice) { this.localPrice = localPrice; return this; }
        public Builder localPromoPrice(BigDecimal localPromoPrice) { this.localPromoPrice = localPromoPrice; return this; }
        public Builder isAvailableForSale(Boolean isAvailableForSale) { this.isAvailableForSale = isAvailableForSale; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder imageUrl(String imageUrl) { this.imageUrl = imageUrl; return this; }

        public ShopProductDto build() {
            return new ShopProductDto(id, name, slug, categoryName, brand, basePrice, baseSalePrice, localPrice, localPromoPrice, isAvailableForSale, status, imageUrl);
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }
    public BigDecimal getBasePrice() { return basePrice; }
    public void setBasePrice(BigDecimal basePrice) { this.basePrice = basePrice; }
    public BigDecimal getBaseSalePrice() { return baseSalePrice; }
    public void setBaseSalePrice(BigDecimal baseSalePrice) { this.baseSalePrice = baseSalePrice; }
    public BigDecimal getLocalPrice() { return localPrice; }
    public void setLocalPrice(BigDecimal localPrice) { this.localPrice = localPrice; }
    public BigDecimal getLocalPromoPrice() { return localPromoPrice; }
    public void setLocalPromoPrice(BigDecimal localPromoPrice) { this.localPromoPrice = localPromoPrice; }
    public Boolean getIsAvailableForSale() { return isAvailableForSale; }
    public void setIsAvailableForSale(Boolean isAvailableForSale) { this.isAvailableForSale = isAvailableForSale; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
}
