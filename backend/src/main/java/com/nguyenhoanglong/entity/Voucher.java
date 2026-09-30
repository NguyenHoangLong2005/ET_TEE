package com.nguyenhoanglong.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "vouchers")
public class Voucher {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    private String description;

    /** PERCENT | FIXED_AMOUNT | FREE_SHIPPING */
    @Column(nullable = false)
    private String type = "PERCENT";

    @Column(name = "discount_value", nullable = false)
    private BigDecimal discountValue;

    @Column(name = "min_order_amount")
    private BigDecimal minOrderAmount = BigDecimal.ZERO;

    @Column(name = "max_discount_amount")
    private BigDecimal maxDiscountAmount;

    @Column(name = "max_uses")
    private Integer maxUses;

    @Column(name = "used_count")
    private Integer usedCount = 0;

    @Column(name = "per_user_limit")
    private Integer perUserLimit = 1;

    @Column(name = "is_active")
    private Boolean isActive = true;

    /** ACTIVE | PAUSED | EXPIRED */
    @Column
    private String status = "ACTIVE";

    /** ALL | NEW_CUSTOMER | RETURNING_CUSTOMER */
    @Column(name = "target_group")
    private String targetGroup = "ALL";

    @Column(name = "free_shipping")
    private Boolean freeShipping = false;

    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "end_date")
    private LocalDateTime endDate;

    @Column(name = "shop_id")
    private Long shopId;

    @Column(name = "granted_to_customer_id")
    private String grantedToCustomerId;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public String getGrantedToCustomerId() { return grantedToCustomerId; }
    public void setGrantedToCustomerId(String grantedToCustomerId) { this.grantedToCustomerId = grantedToCustomerId; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public BigDecimal getDiscountValue() { return discountValue; }
    public void setDiscountValue(BigDecimal discountValue) { this.discountValue = discountValue; }
    public BigDecimal getMinOrderAmount() { return minOrderAmount; }
    public void setMinOrderAmount(BigDecimal minOrderAmount) { this.minOrderAmount = minOrderAmount; }
    public BigDecimal getMaxDiscountAmount() { return maxDiscountAmount; }
    public void setMaxDiscountAmount(BigDecimal maxDiscountAmount) { this.maxDiscountAmount = maxDiscountAmount; }
    public Integer getMaxUses() { return maxUses; }
    public void setMaxUses(Integer maxUses) { this.maxUses = maxUses; }
    public Integer getUsedCount() { return usedCount; }
    public void setUsedCount(Integer usedCount) { this.usedCount = usedCount; }
    public Integer getPerUserLimit() { return perUserLimit; }
    public void setPerUserLimit(Integer perUserLimit) { this.perUserLimit = perUserLimit; }
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getTargetGroup() { return targetGroup; }
    public void setTargetGroup(String targetGroup) { this.targetGroup = targetGroup; }
    public Boolean getFreeShipping() { return freeShipping; }
    public void setFreeShipping(Boolean freeShipping) { this.freeShipping = freeShipping; }
    public LocalDateTime getStartDate() { return startDate; }
    public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }
    public LocalDateTime getEndDate() { return endDate; }
    public void setEndDate(LocalDateTime endDate) { this.endDate = endDate; }
    public Long getShopId() { return shopId; }
    public void setShopId(Long shopId) { this.shopId = shopId; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    @Transient
    public String getDiscountType() {
        if ("FREE_SHIPPING".equalsIgnoreCase(type)) return "FREE_SHIP";
        if ("PERCENT".equalsIgnoreCase(type)) return "PERCENTAGE";
        return type;
    }

    public void setDiscountType(String discountType) {
        if (discountType != null) {
            if ("PERCENTAGE".equalsIgnoreCase(discountType)) this.type = "PERCENT";
            else if ("FREE_SHIP".equalsIgnoreCase(discountType)) {
                this.type = "FREE_SHIPPING";
                this.freeShipping = true;
            } else {
                this.type = discountType;
            }
        }
    }

    @Transient
    public BigDecimal getMinOrderValue() { return minOrderAmount; }
    public void setMinOrderValue(BigDecimal minOrderValue) { this.minOrderAmount = minOrderValue; }

    @Transient
    public Integer getMaxUsage() { return maxUses; }
    public void setMaxUsage(Integer maxUsage) { this.maxUses = maxUsage; }

    @Transient
    public Integer getUsageCount() { return usedCount != null ? usedCount : 0; }

    @Transient
    public LocalDateTime getExpiresAt() { return endDate; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.endDate = expiresAt; }

    @Transient
    public Boolean getIsPublic() { return grantedToCustomerId == null; }
    public void setIsPublic(Boolean isPublic) {
        // public voucher has no customer restriction
        if (Boolean.TRUE.equals(isPublic)) {
            this.grantedToCustomerId = null;
        }
    }
}
