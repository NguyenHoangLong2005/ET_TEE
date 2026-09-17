package com.ettee.opscore.cart.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "carts", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class Cart {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "uuid")
    private UUID id;
    @Column(name = "user_id", columnDefinition = "uuid")
    private UUID userId;
    @Column(name = "session_id", columnDefinition = "uuid")
    private UUID sessionId;
    @Column(nullable = false, length = 20)
    private String status = "active";
    @Column(name = "merged_into", columnDefinition = "uuid")
    private UUID mergedInto;
    @Column(nullable = false)
    private long version = 0;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @jakarta.persistence.PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @jakarta.persistence.PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
        version++;
    }
}