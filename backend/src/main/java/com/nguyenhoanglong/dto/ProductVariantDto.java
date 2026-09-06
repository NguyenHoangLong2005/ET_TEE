package com.nguyenhoanglong.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class ProductVariantDto {
    private Long id;

    @NotBlank(message = "SKU is required")
    private String sku;

    private String color;
    private String size;
    private BigDecimal price;

    @NotNull(message = "Stock cannot be null")
    @Min(value = 0, message = "Stock must be greater than or equal to 0")
    private Integer stock;

    public ProductVariantDto() {}

    public ProductVariantDto(Long id, String sku, String color, String size, BigDecimal price, Integer stock) {
        this.id = id;
        this.sku = sku;
        this.color = color;
        this.size = size;
        this.price = price;
        this.stock = stock;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public String getSize() { return size; }
    public void setSize(String size) { this.size = size; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }

    public static ProductVariantDtoBuilder builder() {
        return new ProductVariantDtoBuilder();
    }

    public static class ProductVariantDtoBuilder {
        private Long id;
        private String sku;
        private String color;
        private String size;
        private BigDecimal price;
        private Integer stock;

        public ProductVariantDtoBuilder id(Long id) { this.id = id; return this; }
        public ProductVariantDtoBuilder sku(String sku) { this.sku = sku; return this; }
        public ProductVariantDtoBuilder color(String color) { this.color = color; return this; }
        public ProductVariantDtoBuilder size(String size) { this.size = size; return this; }
        public ProductVariantDtoBuilder price(BigDecimal price) { this.price = price; return this; }
        public ProductVariantDtoBuilder stock(Integer stock) { this.stock = stock; return this; }

        public ProductVariantDto build() {
            return new ProductVariantDto(id, sku, color, size, price, stock);
        }
    }
}
