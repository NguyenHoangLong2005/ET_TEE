package com.ettee.opscore.storeowner.inventory.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "inventory", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class Inventory {

    @EmbeddedId
    private InventoryId id;

    @Column(name = "quantity_on_hand", nullable = false)
    private int quantityOnHand = 0;

    @Column(name = "quantity_reserved", nullable = false)
    private int quantityReserved = 0;

    @Column(name = "reorder_level", nullable = false)
    private int reorderLevel = 0;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    public int getAvailable() {
        return quantityOnHand - quantityReserved;
    }
}
