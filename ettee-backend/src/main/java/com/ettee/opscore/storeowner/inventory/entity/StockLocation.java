package com.ettee.opscore.storeowner.inventory.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Table(name = "stock_locations", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class StockLocation {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @Column(nullable = false, columnDefinition = "text")
    private String name;

    @Column(name = "is_sellable", nullable = false)
    private boolean sellable = true;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
