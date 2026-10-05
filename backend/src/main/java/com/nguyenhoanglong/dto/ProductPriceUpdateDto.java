package com.nguyenhoanglong.dto;

import java.math.BigDecimal;

/**
 * Price / selling state of a product, edited by the store owner. Applies to the whole system:
 * the product, all its variants (cart and checkout charge the variant price) and the storefront.
 */
public class ProductPriceUpdateDto {
    /** List price. Required, whole thousands of VND. */
    private BigDecimal price;
    /** Promotional price. Null removes the promotion. Must be lower than {@code price}. */
    private BigDecimal salePrice;
    /** true = on sale (ACTIVE), false = temporarily off sale (INACTIVE), null = leave as is. */
    private Boolean active;

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public BigDecimal getSalePrice() { return salePrice; }
    public void setSalePrice(BigDecimal salePrice) { this.salePrice = salePrice; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
