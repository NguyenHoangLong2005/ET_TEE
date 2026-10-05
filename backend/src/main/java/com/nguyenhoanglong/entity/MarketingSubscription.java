package com.nguyenhoanglong.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Consent to receive marketing email, per email address (guests can subscribe from the home page
 * newsletter form too). Transactional mail (OTP, orders) never depends on it.
 */
@Entity
@Table(name = "marketing_subscriptions")
public class MarketingSubscription {

    public static final String SUBSCRIBED = "SUBSCRIBED";
    public static final String UNSUBSCRIBED = "UNSUBSCRIBED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "status", nullable = false, length = 20)
    private String status = SUBSCRIBED;

    /** REGISTER | ACCOUNT | NEWSLETTER */
    @Column(name = "source", nullable = false, length = 30)
    private String source;

    @Column(name = "unsubscribe_token", nullable = false, unique = true, length = 64)
    private String unsubscribeToken;

    @Column(name = "consented_at", nullable = false)
    private LocalDateTime consentedAt;

    @Column(name = "unsubscribed_at")
    private LocalDateTime unsubscribedAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public MarketingSubscription() {}

    public boolean isSubscribed() { return SUBSCRIBED.equals(status); }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getUnsubscribeToken() { return unsubscribeToken; }
    public void setUnsubscribeToken(String unsubscribeToken) { this.unsubscribeToken = unsubscribeToken; }
    public LocalDateTime getConsentedAt() { return consentedAt; }
    public void setConsentedAt(LocalDateTime consentedAt) { this.consentedAt = consentedAt; }
    public LocalDateTime getUnsubscribedAt() { return unsubscribedAt; }
    public void setUnsubscribedAt(LocalDateTime unsubscribedAt) { this.unsubscribedAt = unsubscribedAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
