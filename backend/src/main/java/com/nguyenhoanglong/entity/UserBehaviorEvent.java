package com.nguyenhoanglong.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * One storefront interaction (VIEW / ADD_TO_CART / PURCHASE) - the sequence data the
 * session-based recommender (Sprint 2) trains on and reads at serve time.
 *
 * user_id is a plain string, not a FK: it is users.id for signed-in shoppers and a key
 * derived from the guest cart token for guests (BehaviorEventService.resolveUserKey),
 * re-pointed to the real user id when the guest signs in.
 */
@Entity
@Table(name = "user_behavior_events")
public class UserBehaviorEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "event_type", nullable = false, length = 20)
    private String eventType;

    @Column(name = "session_id", length = 36)
    private String sessionId;

    @Column(name = "quantity")
    private Integer quantity = 1;

    @Column(name = "price_at_event", precision = 15, scale = 2)
    private BigDecimal priceAtEvent;

    @Column(name = "source", length = 30)
    private String source;

    @Column(name = "device_type", length = 15)
    private String deviceType;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public UserBehaviorEvent() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public BigDecimal getPriceAtEvent() { return priceAtEvent; }
    public void setPriceAtEvent(BigDecimal priceAtEvent) { this.priceAtEvent = priceAtEvent; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getDeviceType() { return deviceType; }
    public void setDeviceType(String deviceType) { this.deviceType = deviceType; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
