package com.nguyenhoanglong.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Full product form used by the store owner to create / edit a product.
 *
 * Variants are only honoured on CREATE. On edit they are returned read-only:
 * replacing them would orphan inventory rows and order lines that point at the
 * old variant ids, so stock and variant changes stay in the inventory flow.
 */
public class StoreProductFormDto {
    public Long id;
    public String name;
    public String slug;
    public String description;
    public String brand;
    public Long manufacturerId;
    public String manufacturerName;
    public Long supplierId;
    public String supplierName;
    public Long categoryId;
    public String categoryName;
    public String gender;
    public String targetGroup;
    public String productType;
    public String material;
    public BigDecimal price;
    public BigDecimal salePrice;
    public String status;
    public List<ImageForm> images = new ArrayList<>();
    public List<VariantForm> variants = new ArrayList<>();

    public static class ImageForm {
        public String imageUrl;
        public String alt;
        public Boolean isPrimary;
    }

    public static class VariantForm {
        public Long id;
        public String sku;
        public String color;
        public String colorHex;
        public String size;
        public Integer stock;
    }
}
