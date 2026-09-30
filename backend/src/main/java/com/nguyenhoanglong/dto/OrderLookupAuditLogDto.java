package com.nguyenhoanglong.dto;

import java.time.LocalDateTime;

public class OrderLookupAuditLogDto {
    private Long id;
    private String actorId;
    private String actorName;
    private String actorRole;
    private Long actorShopId;
    private String searchType;
    private String searchQuery;
    private Long foundOrderId;
    private String foundOrderCode;
    private String status;
    private LocalDateTime createdAt;

    public OrderLookupAuditLogDto() {}

    public OrderLookupAuditLogDto(Long id, String actorId, String actorName, String actorRole, Long actorShopId, String searchType, String searchQuery, Long foundOrderId, String foundOrderCode, String status, LocalDateTime createdAt) {
        this.id = id;
        this.actorId = actorId;
        this.actorName = actorName;
        this.actorRole = actorRole;
        this.actorShopId = actorShopId;
        this.searchType = searchType;
        this.searchQuery = searchQuery;
        this.foundOrderId = foundOrderId;
        this.foundOrderCode = foundOrderCode;
        this.status = status;
        this.createdAt = createdAt;
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
