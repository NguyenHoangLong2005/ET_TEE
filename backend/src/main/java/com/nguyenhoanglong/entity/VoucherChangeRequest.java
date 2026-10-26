package com.nguyenhoanglong.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Yeu cau sua / xoa mot voucher da duoc duyet, do nhan vien marketing gui. Voucher van chay nguyen
 * trang cho den khi chu cua hang duyet; luc do thay doi trong payload moi duoc ap dung.
 */
@Entity
@Table(name = "voucher_change_requests")
public class VoucherChangeRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "request_id")
    private Long id;

    @Column(name = "voucher_id", nullable = false)
    private Long voucherId;

    /** Chi nhanh cua voucher; null = voucher khong gan chi nhanh, chu cua hang nao cung duyet duoc. */
    @Column(name = "shop_id")
    private Long shopId;

    @Column(name = "action", nullable = false, length = 20)
    private String action; // UPDATE | DELETE

    /** JSON cac truong de xuat (chi voi UPDATE). */
    @Column(name = "payload", columnDefinition = "TEXT")
    private String payload;

    /** Mo ta thay doi cho chu cua hang doc, vd "Giá trị giảm: 10 → 50". */
    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "requested_by")
    private String requestedBy;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "PENDING";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "reviewed_by")
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "review_note", length = 500)
    private String reviewNote;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getVoucherId() { return voucherId; }
    public void setVoucherId(Long voucherId) { this.voucherId = voucherId; }
    public Long getShopId() { return shopId; }
    public void setShopId(Long shopId) { this.shopId = shopId; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getRequestedBy() { return requestedBy; }
    public void setRequestedBy(String requestedBy) { this.requestedBy = requestedBy; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }
    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
    public String getReviewNote() { return reviewNote; }
    public void setReviewNote(String reviewNote) { this.reviewNote = reviewNote; }
}
