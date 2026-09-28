package com.nguyenhoanglong.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Xoa mem tai su dung cot status thay vi them deleted_at rieng: moi truy van
 * hien tai (danh sach khach hang, thong ke, bao cao) da loc "status = 'ACTIVE'"
 * mot cach tuong minh o khap noi, nen mot san pham voi status='DELETED' tu
 * dong bien mat khoi cac truy van do ma khong phai sua gi them. Neu them ca
 * mot cot deleted_at song song se tao ra hai co che roi nhau: mot ban ghi co
 * the "active" theo status nhung "deleted" theo deleted_at hoac nguoc lai.
 * @SQLRestriction o day la lop chan chung o tang entity, ke ca cho cac truy
 * van (con it) chua tu loc status.
 */
@Entity
@Table(name = "products", indexes = {
    @Index(name = "idx_products_status_tg", columnList = "status, target_group"),
    @Index(name = "idx_products_tg_gender", columnList = "target_group, gender"),
    @Index(name = "idx_products_prod_type", columnList = "product_type"),
    @Index(name = "idx_products_slug", columnList = "slug"),
    @Index(name = "idx_products_status_price", columnList = "status, price"),
    @Index(name = "idx_products_status_saleprice", columnList = "status, sale_price"),
    @Index(name = "idx_products_status_isnew", columnList = "status, is_new"),
    @Index(name = "idx_products_status_isbest", columnList = "status, is_best_seller")
})
@BatchSize(size = 30)
@SQLRestriction("status <> 'DELETED'")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false, unique = true, length = 255)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 100)
    private String brand;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "sale_price", precision = 12, scale = 2)
    private BigDecimal salePrice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(length = 20)
    private String gender;

    @Column(name = "target_group", length = 50)
    private String targetGroup;

    @Column(name = "product_type", length = 100)
    private String productType;

    @Column(length = 100)
    private String material;

    @Column(length = 100)
    private String style;

    @Column(name = "status", length = 50)
    private String status;

    @Column(name = "is_new")
    private Boolean isNew = false;

    @Column(name = "is_best_seller")
    private Boolean isBestSeller = false;

    @Column(name = "is_sale")
    private Boolean isSale = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "average_rating")
    private Double averageRating = 0.0;

    @Column(name = "total_reviews")
    private Integer totalReviews = 0;

    @Column(name = "sold_count")
    private Integer soldCount = 0;

    @Column(name = "created_by", length = 255)
    private String createdBy;

    @Column(name = "updated_by", length = 255)
    private String updatedBy;

    @ElementCollection
    @CollectionTable(name = "product_style_tags", joinColumns = @JoinColumn(name = "product_id"))
    @Column(name = "tag")
    @BatchSize(size = 30)
    private List<String> styleTags = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "product_recommendation_tags", joinColumns = @JoinColumn(name = "product_id"))
    @Column(name = "tag")
    @BatchSize(size = 30)
    private List<String> recommendationTags = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 30)
    private List<ProductVariant> variants = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 30)
    private List<ProductImage> images = new ArrayList<>();

    public Product() {}

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void addVariant(ProductVariant variant) {
        variants.add(variant);
        variant.setProduct(this);
    }

    public void removeVariant(ProductVariant variant) {
        variants.remove(variant);
        variant.setProduct(null);
    }

    public void addImage(ProductImage image) {
        images.add(image);
        image.setProduct(this);
    }

    public void removeImage(ProductImage image) {
        images.remove(image);
        image.setProduct(null);
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public BigDecimal getSalePrice() { return salePrice; }
    public void setSalePrice(BigDecimal salePrice) { this.salePrice = salePrice; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public String getTargetGroup() { return targetGroup; }
    public void setTargetGroup(String targetGroup) { this.targetGroup = targetGroup; }
    public String getProductType() { return productType; }
    public void setProductType(String productType) { this.productType = productType; }
    public String getMaterial() { return material; }
    public void setMaterial(String material) { this.material = material; }
    public String getStyle() { return style; }
    public void setStyle(String style) { this.style = style; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Boolean getIsNew() { return isNew; }
    public void setIsNew(Boolean isNew) { this.isNew = isNew; }
    public Boolean getIsBestSeller() { return isBestSeller; }
    public void setIsBestSeller(Boolean isBestSeller) { this.isBestSeller = isBestSeller; }
    public Boolean getIsSale() { return isSale; }
    public void setIsSale(Boolean isSale) { this.isSale = isSale; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
    public List<String> getStyleTags() { return styleTags; }
    public void setStyleTags(List<String> styleTags) { this.styleTags = styleTags; }
    public List<String> getRecommendationTags() { return recommendationTags; }
    public void setRecommendationTags(List<String> recommendationTags) { this.recommendationTags = recommendationTags; }
    public List<ProductVariant> getVariants() { return variants; }
    public void setVariants(List<ProductVariant> variants) { this.variants = variants; }
    public List<ProductImage> getImages() { return images; }
    public void setImages(List<ProductImage> images) { this.images = images; }
    public Double getAverageRating() { return averageRating; }
    public void setAverageRating(Double averageRating) { this.averageRating = averageRating; }
    public Integer getTotalReviews() { return totalReviews; }
    public void setTotalReviews(Integer totalReviews) { this.totalReviews = totalReviews; }
    public Integer getSoldCount() { return soldCount; }
    public void setSoldCount(Integer soldCount) { this.soldCount = soldCount; }
}
