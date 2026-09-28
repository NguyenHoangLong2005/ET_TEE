package com.nguyenhoanglong.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "store_featured_categories", uniqueConstraints = {
    @UniqueConstraint(name = "uk_store_cat", columnNames = {"shop_id", "category_id"})
})
public class StoreFeaturedCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "shop_id", nullable = false)
    private Long shopId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    public StoreFeaturedCategory() {}

    public StoreFeaturedCategory(Long shopId, Category category, Integer displayOrder) {
        this.shopId = shopId;
        this.category = category;
        this.displayOrder = displayOrder != null ? displayOrder : 0;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getShopId() { return shopId; }
    public void setShopId(Long shopId) { this.shopId = shopId; }

    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }

    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
}
