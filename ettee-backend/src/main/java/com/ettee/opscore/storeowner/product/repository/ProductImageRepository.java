package com.ettee.opscore.storeowner.product.repository;

import com.ettee.opscore.storeowner.product.entity.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductImageRepository extends JpaRepository<ProductImage, UUID> {
    List<ProductImage> findAllByProductIdOrderBySortOrderAsc(UUID productId);
}
