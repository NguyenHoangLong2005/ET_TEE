package com.nguyenhoanglong.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class ProductDto {
    private Long id;

    @NotBlank(message = "Product name is required")
    private String name;

    private String description;
    private String brand;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
    private BigDecimal price;

    private CategoryDto category;
    private Long categoryId;

    private String gender;
    private String material;
    private String style;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Valid
    private List<ProductVariantDto> variants = new ArrayList<>();

    public ProductDto() {}

    public ProductDto(Long id, String name, String description, String brand, BigDecimal price, CategoryDto category,
                      Long categoryId, String gender, String material, String style, LocalDateTime createdAt,
                      LocalDateTime updatedAt, List<ProductVariantDto> variants) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.brand = brand;
        this.price = price;
        this.category = category;
        this.categoryId = categoryId;
        this.gender = gender;
        this.material = material;
        this.style = style;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.variants = variants != null ? variants : new ArrayList<>();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public CategoryDto getCategory() { return category; }
    public void setCategory(CategoryDto category) { this.category = category; }

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getMaterial() { return material; }
    public void setMaterial(String material) { this.material = material; }

    public String getStyle() { return style; }
    public void setStyle(String style) { this.style = style; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<ProductVariantDto> getVariants() { return variants; }
    public void setVariants(List<ProductVariantDto> variants) { this.variants = variants; }

    public static ProductDtoBuilder builder() {
        return new ProductDtoBuilder();
    }

    public static class ProductDtoBuilder {
        private Long id;
        private String name;
        private String description;
        private String brand;
        private BigDecimal price;
        private CategoryDto category;
        private Long categoryId;
        private String gender;
        private String material;
        private String style;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private List<ProductVariantDto> variants = new ArrayList<>();

        public ProductDtoBuilder id(Long id) { this.id = id; return this; }
        public ProductDtoBuilder name(String name) { this.name = name; return this; }
        public ProductDtoBuilder description(String description) { this.description = description; return this; }
        public ProductDtoBuilder brand(String brand) { this.brand = brand; return this; }
        public ProductDtoBuilder price(BigDecimal price) { this.price = price; return this; }
        public ProductDtoBuilder category(CategoryDto category) { this.category = category; return this; }
        public ProductDtoBuilder categoryId(Long categoryId) { this.categoryId = categoryId; return this; }
        public ProductDtoBuilder gender(String gender) { this.gender = gender; return this; }
        public ProductDtoBuilder material(String material) { this.material = material; return this; }
        public ProductDtoBuilder style(String style) { this.style = style; return this; }
        public ProductDtoBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public ProductDtoBuilder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }
        public ProductDtoBuilder variants(List<ProductVariantDto> variants) { this.variants = variants; return this; }

        public ProductDto build() {
            return new ProductDto(id, name, description, brand, price, category, categoryId, gender, material, style, createdAt, updatedAt, variants);
        }
    }
}
