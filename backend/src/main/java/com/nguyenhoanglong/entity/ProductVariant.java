package com.nguyenhoanglong.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "product_variants")
public class ProductVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, unique = true, length = 100)
    private String sku;

    @Column(length = 50)
    private String color;

    @Column(name = "color_hex", length = 50)
    private String colorHex;

    @Column(length = 50)
    private String size;

    @Column(precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "sale_price", precision = 12, scale = 2)
    private BigDecimal salePrice;

    @Column(nullable = false)
    private Integer stock = 0;

    @Column(name = "available_quantity", nullable = false)
    private Integer availableQuantity = 0;

    public ProductVariant() {}

    public ProductVariant(Long id, Product product, String sku, String color, String size, BigDecimal price, Integer stock) {
        this.id = id;
        this.product = product;
        this.sku = sku;
        this.color = color;
        this.size = size;
        this.price = price;
        this.stock = stock != null ? stock : 0;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public String getColorHex() { return colorHex; }
    public void setColorHex(String colorHex) { this.colorHex = colorHex; }

    public BigDecimal getSalePrice() { return salePrice; }
    public void setSalePrice(BigDecimal salePrice) { this.salePrice = salePrice; }

    public Integer getAvailableQuantity() { return availableQuantity; }
    public void setAvailableQuantity(Integer availableQuantity) { this.availableQuantity = availableQuantity; }

    public String getSize() { return size; }
    public void setSize(String size) { this.size = size; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }

    public static ProductVariantBuilder builder() {
        return new ProductVariantBuilder();
    }

    public static class ProductVariantBuilder {
        private Long id;
        private Product product;
        private String sku;
        private String color;
        private String colorHex;
        private String size;
        private BigDecimal price;
        private BigDecimal salePrice;
        private Integer stock = 0;
        private Integer availableQuantity = 0;

        public ProductVariantBuilder id(Long id) { this.id = id; return this; }
        public ProductVariantBuilder product(Product product) { this.product = product; return this; }
        public ProductVariantBuilder sku(String sku) { this.sku = sku; return this; }
        public ProductVariantBuilder color(String color) { this.color = color; return this; }
        public ProductVariantBuilder colorHex(String colorHex) { this.colorHex = colorHex; return this; }
        public ProductVariantBuilder size(String size) { this.size = size; return this; }
        public ProductVariantBuilder price(BigDecimal price) { this.price = price; return this; }
        public ProductVariantBuilder salePrice(BigDecimal salePrice) { this.salePrice = salePrice; return this; }
        public ProductVariantBuilder stock(Integer stock) { this.stock = stock; return this; }
        public ProductVariantBuilder availableQuantity(Integer availableQuantity) { this.availableQuantity = availableQuantity; return this; }

        public ProductVariant build() {
            ProductVariant variant = new ProductVariant(id, product, sku, color, size, price, stock);
            variant.setColorHex(colorHex);
            variant.setSalePrice(salePrice);
            variant.setAvailableQuantity(availableQuantity);
            return variant;
        }
    }
}
