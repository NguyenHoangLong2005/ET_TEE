package com.nguyenhoanglong.dto;

import java.math.BigDecimal;

public class ShopProductConfigUpdateDto {
    private BigDecimal localPrice;
    private BigDecimal localPromoPrice;
    private Boolean isAvailableForSale;

    public ShopProductConfigUpdateDto() {}

    public ShopProductConfigUpdateDto(BigDecimal localPrice, BigDecimal localPromoPrice, Boolean isAvailableForSale) {
        this.localPrice = localPrice;
        this.localPromoPrice = localPromoPrice;
        this.isAvailableForSale = isAvailableForSale;
    }

    public BigDecimal getLocalPrice() { return localPrice; }
    public void setLocalPrice(BigDecimal localPrice) { this.localPrice = localPrice; }
    public BigDecimal getLocalPromoPrice() { return localPromoPrice; }
    public void setLocalPromoPrice(BigDecimal localPromoPrice) { this.localPromoPrice = localPromoPrice; }
    public Boolean getIsAvailableForSale() { return isAvailableForSale; }
    public void setIsAvailableForSale(Boolean isAvailableForSale) { this.isAvailableForSale = isAvailableForSale; }
}
