package com.ettee.opscore.storeowner.product.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Table(name = "product_images", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class ProductImage {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "product_id", nullable = false, columnDefinition = "uuid")
    private UUID productId;

    @Column(name = "variant_id", columnDefinition = "uuid")
    private UUID variantId;

    @Column(nullable = false, columnDefinition = "text")
    private String url;

    @Column(name = "alt_text", length = 255)
    private String altText;

    @Column(name = "is_primary", nullable = false)
    private boolean primary = false;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;
}
