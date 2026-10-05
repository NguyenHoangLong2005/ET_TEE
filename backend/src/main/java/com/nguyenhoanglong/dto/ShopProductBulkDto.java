package com.nguyenhoanglong.dto;

import java.util.List;

/** Body of the bulk endpoint: the products to act on and the action to apply to all of them. */
public class ShopProductBulkDto {
    private List<Long> productIds;
    /** ACTIVATE | DEACTIVATE | CLEAR_SALE */
    private String action;

    public List<Long> getProductIds() { return productIds; }
    public void setProductIds(List<Long> productIds) { this.productIds = productIds; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
}
