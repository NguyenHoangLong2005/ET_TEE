package com.ettee.opscore.identity.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Table(name = "permissions", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class Permission {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false, unique = true, length = 100)
    private String code;

    @Column(columnDefinition = "text")
    private String description;
}
