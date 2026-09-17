package com.ettee.opscore.storeowner.product.repository;

import com.ettee.opscore.storeowner.product.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, UUID> {
    List<ProductVariant> findAllByProductId(UUID productId);
    Optional<ProductVariant> findBySku(String sku);
    boolean existsBySku(String sku);
}
