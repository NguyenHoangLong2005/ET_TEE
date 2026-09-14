package com.nguyenhoanglong.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

public class CartDto {

    public static class AddToCartRequest {
        @NotNull(message = "Variant ID không được để trống")
        private Long variantId;

        @NotNull(message = "Số lượng không được để trống")
        @Min(value = 1, message = "Số lượng phải lớn hơn 0")
        private Integer quantity;

        public Long getVariantId() { return variantId; }
        public void setVariantId(Long variantId) { this.variantId = variantId; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
    }

    public static class UpdateCartItemRequest {
        @NotNull(message = "Số lượng không được để trống")
        @Min(value = 0, message = "Số lượng không được âm")
        private Integer quantity;

        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
    }

    public static class CartResponse {
        private Long id;
        private List<CartItemResponse> items;
        private BigDecimal subtotal;
        private Integer totalQuantity;

        public CartResponse() {}
        
        public CartResponse(Long id, List<CartItemResponse> items, BigDecimal subtotal, Integer totalQuantity) {
            this.id = id;
            this.items = items;
            this.subtotal = subtotal;
            this.totalQuantity = totalQuantity;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public List<CartItemResponse> getItems() { return items; }
        public void setItems(List<CartItemResponse> items) { this.items = items; }
        public BigDecimal getSubtotal() { return subtotal; }
        public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
        public Integer getTotalQuantity() { return totalQuantity; }
        public void setTotalQuantity(Integer totalQuantity) { this.totalQuantity = totalQuantity; }
    }

    public static class CartItemResponse {
        private Long id;
        private Long variantId;
        private String productSlug;
        private String productName;
        private String productImage;
        private String color;
        private String colorHex;
        private String size;
        private BigDecimal price;
        private BigDecimal salePrice;
        private Integer quantity;
        private Integer availableQuantity;
        private BigDecimal itemTotal;

        public CartItemResponse() {}

        public CartItemResponse(Long id, Long variantId, String productSlug, String productName, String productImage, String color, String colorHex, String size, BigDecimal price, BigDecimal salePrice, Integer quantity, Integer availableQuantity, BigDecimal itemTotal) {
            this.id = id;
            this.variantId = variantId;
            this.productSlug = productSlug;
            this.productName = productName;
            this.productImage = productImage;
            this.color = color;
            this.colorHex = colorHex;
            this.size = size;
            this.price = price;
            this.salePrice = salePrice;
            this.quantity = quantity;
            this.availableQuantity = availableQuantity;
            this.itemTotal = itemTotal;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public Long getVariantId() { return variantId; }
        public void setVariantId(Long variantId) { this.variantId = variantId; }
        public String getProductSlug() { return productSlug; }
        public void setProductSlug(String productSlug) { this.productSlug = productSlug; }
        public String getProductName() { return productName; }
        public void setProductName(String productName) { this.productName = productName; }
        public String getProductImage() { return productImage; }
        public void setProductImage(String productImage) { this.productImage = productImage; }
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
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
        public Integer getAvailableQuantity() { return availableQuantity; }
        public void setAvailableQuantity(Integer availableQuantity) { this.availableQuantity = availableQuantity; }
        public BigDecimal getItemTotal() { return itemTotal; }
        public void setItemTotal(BigDecimal itemTotal) { this.itemTotal = itemTotal; }
    }
}
