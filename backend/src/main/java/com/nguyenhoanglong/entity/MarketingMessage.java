package com.nguyenhoanglong.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * One marketing message or voucher handed to one customer (campaign or lifecycle automation).
 * Used to never send the same automation twice and to measure campaigns (opens via the email
 * tracking token, redemptions via the voucher).
 */
@Entity
@Table(name = "marketing_messages")
public class MarketingMessage {

    public enum Kind { WELCOME, ABANDONED_CART, WIN_BACK, CAMPAIGN }

    /** EMAIL = an email went out; WALLET = only added to "Voucher của tôi" (no email consent). */
    public enum Channel { EMAIL, WALLET }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 30)
    private Kind kind;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false, length = 10)
    private Channel channel;

    /** SENT | FAILED */
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "email")
    private String email;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "campaign_id")
    private Long campaignId;

    @Column(name = "voucher_id")
    private Long voucherId;

    @Column(name = "email_tracking_token", length = 64)
    private String emailTrackingToken;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public MarketingMessage() {}

    public Long getId() { return id; }
    public Kind getKind() { return kind; }
    public void setKind(Kind kind) { this.kind = kind; }
    public Channel getChannel() { return channel; }
    public void setChannel(Channel channel) { this.channel = channel; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public Long getCampaignId() { return campaignId; }
    public void setCampaignId(Long campaignId) { this.campaignId = campaignId; }
    public Long getVoucherId() { return voucherId; }
    public void setVoucherId(Long voucherId) { this.voucherId = voucherId; }
    public String getEmailTrackingToken() { return emailTrackingToken; }
    public void setEmailTrackingToken(String emailTrackingToken) { this.emailTrackingToken = emailTrackingToken; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
