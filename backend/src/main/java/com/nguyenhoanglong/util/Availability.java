package com.nguyenhoanglong.util;

import com.nguyenhoanglong.dto.ProductDto;
import com.nguyenhoanglong.dto.ProductVariantDto;

import java.util.List;

/**
 * Recommendations (trending, for you, cart complements, outfits) used to suggest products that
 * were sold out in every size. Search and "recently viewed" still show them: there the shopper
 * is looking for that product, not being offered one.
 */
public final class Availability {
    private Availability() {}

    /** False only when the product lists variants and none can be bought; no variant data = unknown, kept. */
    public static boolean inStock(ProductDto p) {
        List<ProductVariantDto> variants = p.getVariants();
        if (variants == null || variants.isEmpty()) return true;
        return variants.stream().anyMatch(v -> v.getAvailableQuantity() == null || v.getAvailableQuantity() > 0);
    }

    public static List<ProductDto> inStockOnly(List<ProductDto> products) {
        return products.stream().filter(Availability::inStock).toList();
    }
}
