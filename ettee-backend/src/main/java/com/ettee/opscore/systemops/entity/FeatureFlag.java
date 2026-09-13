package com.ettee.opscore.systemops.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "feature_flags", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class FeatureFlag {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false, unique = true, length = 100)
    private String key;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "is_enabled", nullable = false)
    private boolean enabled = false;

    @Column(name = "rollout_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal rolloutPercentage = BigDecimal.ZERO;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "updated_by", columnDefinition = "uuid")
    private UUID updatedBy;

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }
}
