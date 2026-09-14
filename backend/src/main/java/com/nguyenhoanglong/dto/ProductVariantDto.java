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
    private String colorHex;
    private String size;
    private BigDecimal price;
    private BigDecimal salePrice;
    
    @NotNull(message = "Stock cannot be null")
    @Min(value = 0, message = "Stock must be greater than or equal to 0")
    private Integer stock;
    
    private Integer availableQuantity;

    public ProductVariantDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public String getColorHex() { return colorHex; }
    public void setColorHex(String colorHex) { this.colorHex = colorHex; }
    public String getSize() { return size; }
    public void setSize(String size) { this.size = size; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public BigDecimal getSalePrice() { return salePrice; }
    public void setSalePrice(BigDecimal salePrice) { this.salePrice = salePrice; }
    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }
    public Integer getAvailableQuantity() { return availableQuantity; }
    public void setAvailableQuantity(Integer availableQuantity) { this.availableQuantity = availableQuantity; }

    public static ProductVariantDtoBuilder builder() {
        return new ProductVariantDtoBuilder();
    }

    public static class ProductVariantDtoBuilder {
        private ProductVariantDto dto = new ProductVariantDto();

        public ProductVariantDtoBuilder id(Long id) { dto.setId(id); return this; }
        public ProductVariantDtoBuilder sku(String sku) { dto.setSku(sku); return this; }
        public ProductVariantDtoBuilder color(String color) { dto.setColor(color); return this; }
        public ProductVariantDtoBuilder colorHex(String colorHex) { dto.setColorHex(colorHex); return this; }
        public ProductVariantDtoBuilder size(String size) { dto.setSize(size); return this; }
        public ProductVariantDtoBuilder price(BigDecimal price) { dto.setPrice(price); return this; }
        public ProductVariantDtoBuilder salePrice(BigDecimal salePrice) { dto.setSalePrice(salePrice); return this; }
        public ProductVariantDtoBuilder stock(Integer stock) { dto.setStock(stock); return this; }
        public ProductVariantDtoBuilder availableQuantity(Integer availableQuantity) { dto.setAvailableQuantity(availableQuantity); return this; }

        public ProductVariantDto build() { return dto; }
    }
}
