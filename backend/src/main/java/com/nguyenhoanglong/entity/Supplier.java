package com.nguyenhoanglong.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Nha cung ung.
 *
 * shopId NULL = nha cung ung DUNG CHUNG toan chuoi (chi ADMIN sua/xoa, moi
 * SHOP_OWNER deu xem va chon duoc khi nhap hang). shopId co gia tri = nha cung
 * ung RIENG cua mot chi nhanh (SHOP_OWNER cua chi nhanh do CRUD toan quyen).
 *
 * Xoa mem: deleted_at != null nghia la da xoa. @SQLRestriction tu dong loai
 * ban ghi da xoa khoi MOI truy van qua entity nay.
 */
@Entity
@Table(name = "suppliers")
@SQLRestriction("deleted_at IS NULL")
public class Supplier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 255)
    private String address;

    @Column(length = 50)
    private String phone;

    @Column(length = 150)
    private String email;

    @Column(name = "product_type", length = 150)
    private String productType;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** NULL = dung chung toan chuoi; co gia tri = rieng cua chi nhanh nay. */
    @Column(name = "shop_id")
    private Long shopId;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 255)
    private String createdBy;

    @Column(name = "updated_by", length = 255)
    private String updatedBy;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public Supplier() {}

    public Supplier(String name, String address, String phone, String email, String productType, String description) {
        this.name = name;
        this.address = address;
        this.phone = phone;
        this.email = email;
        this.productType = productType;
        this.description = description;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getProductType() { return productType; }
    public void setProductType(String productType) { this.productType = productType; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Long getShopId() { return shopId; }
    public void setShopId(Long shopId) { this.shopId = shopId; }

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
