package com.nguyenhoanglong.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Cau hinh san pham tai mot chi nhanh cu the (gia local, ton kho ban theo shop).
 * SHOP_OWNER CRUD toan quyen, nhung chi trong pham vi shop_id cua minh.
 *
 * Xoa mem: deleted_at != null nghia la da xoa. Rang buoc unique(shop_id,
 * product_id) khong con khai bao qua @UniqueConstraint (khong ho tro dieu
 * kien WHERE); DB that dung index UNIQUE PARTIAL loai ban ghi da xoa, xem
 * migration V20260929010000.
 */
@Entity
@Table(name = "shop_product_configs")
@SQLRestriction("deleted_at IS NULL")
public class ShopProductConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "shop_id", nullable = false)
    private Long shopId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "local_price", precision = 12, scale = 2)
    private BigDecimal localPrice;

    @Column(name = "local_promo_price", precision = 12, scale = 2)
    private BigDecimal localPromoPrice;

    @Column(name = "is_available_for_sale", nullable = false)
    private Boolean isAvailableForSale = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 255)
    private String createdBy;

    @Column(name = "updated_by", length = 255)
    private String updatedBy;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public ShopProductConfig() {}

    public ShopProductConfig(Long shopId, Long productId, BigDecimal localPrice, BigDecimal localPromoPrice, Boolean isAvailableForSale) {
        this.shopId = shopId;
        this.productId = productId;
        this.localPrice = localPrice;
        this.localPromoPrice = localPromoPrice;
        this.isAvailableForSale = isAvailableForSale != null ? isAvailableForSale : true;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getShopId() { return shopId; }
    public void setShopId(Long shopId) { this.shopId = shopId; }
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public BigDecimal getLocalPrice() { return localPrice; }
    public void setLocalPrice(BigDecimal localPrice) { this.localPrice = localPrice; }
    public BigDecimal getLocalPromoPrice() { return localPromoPrice; }
    public void setLocalPromoPrice(BigDecimal localPromoPrice) { this.localPromoPrice = localPromoPrice; }
    public Boolean getIsAvailableForSale() { return isAvailableForSale; }
    public void setIsAvailableForSale(Boolean isAvailableForSale) { this.isAvailableForSale = isAvailableForSale; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    public LocalDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; }
}
