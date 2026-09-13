package com.ettee.opscore.order.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "customers", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class Customer {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "user_id", columnDefinition = "uuid")
    private UUID userId;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(length = 255)
    private String email;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
