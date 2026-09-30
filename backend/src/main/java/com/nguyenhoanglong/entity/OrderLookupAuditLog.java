package com.nguyenhoanglong.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "order_lookup_audit_logs")
public class OrderLookupAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_id", nullable = false)
    private String actorId;

    @Column(name = "actor_name")
    private String actorName;

    @Column(name = "actor_role")
    private String actorRole;

    @Column(name = "actor_shop_id")
    private Long actorShopId;

    @Column(name = "search_type", nullable = false)
    private String searchType; // "PHONE" or "ORDER_CODE"

    @Column(name = "search_query", nullable = false)
    private String searchQuery;

    @Column(name = "found_order_id")
    private Long foundOrderId;

    @Column(name = "found_order_code")
    private String foundOrderCode;

    @Column(name = "status", nullable = false)
    private String status; // "SUCCESS", "NOT_FOUND", "FORBIDDEN"

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public OrderLookupAuditLog() {}

    public OrderLookupAuditLog(String actorId, String actorName, String actorRole, Long actorShopId, String searchType, String searchQuery, Long foundOrderId, String foundOrderCode, String status) {
        this.actorId = actorId;
        this.actorName = actorName;
        this.actorRole = actorRole;
        this.actorShopId = actorShopId;
        this.searchType = searchType;
        this.searchQuery = searchQuery;
        this.foundOrderId = foundOrderId;
        this.foundOrderCode = foundOrderCode;
        this.status = status;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getActorId() { return actorId; }
    public void setActorId(String actorId) { this.actorId = actorId; }

    public String getActorName() { return actorName; }
    public void setActorName(String actorName) { this.actorName = actorName; }

    public String getActorRole() { return actorRole; }
    public void setActorRole(String actorRole) { this.actorRole = actorRole; }

    public Long getActorShopId() { return actorShopId; }
    public void setActorShopId(Long actorShopId) { this.actorShopId = actorShopId; }

    public String getSearchType() { return searchType; }
    public void setSearchType(String searchType) { this.searchType = searchType; }

    public String getSearchQuery() { return searchQuery; }
    public void setSearchQuery(String searchQuery) { this.searchQuery = searchQuery; }

    public Long getFoundOrderId() { return foundOrderId; }
    public void setFoundOrderId(Long foundOrderId) { this.foundOrderId = foundOrderId; }

    public String getFoundOrderCode() { return foundOrderCode; }
    public void setFoundOrderCode(String foundOrderCode) { this.foundOrderCode = foundOrderCode; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
