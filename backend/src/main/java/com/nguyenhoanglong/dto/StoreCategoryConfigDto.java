package com.nguyenhoanglong.dto;

import java.util.List;

public class StoreCategoryConfigDto {
    private Long shopId;
    private List<CategoryDto> featuredCategories;

    public StoreCategoryConfigDto() {}

    public StoreCategoryConfigDto(Long shopId, List<CategoryDto> featuredCategories) {
        this.shopId = shopId;
        this.featuredCategories = featuredCategories;
    }

    public Long getShopId() { return shopId; }
    public void setShopId(Long shopId) { this.shopId = shopId; }

    public List<CategoryDto> getFeaturedCategories() { return featuredCategories; }
    public void setFeaturedCategories(List<CategoryDto> featuredCategories) { this.featuredCategories = featuredCategories; }
}
