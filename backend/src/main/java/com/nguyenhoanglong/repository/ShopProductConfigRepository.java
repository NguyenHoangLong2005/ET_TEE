package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.ShopProductConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShopProductConfigRepository extends JpaRepository<ShopProductConfig, Long> {

    Optional<ShopProductConfig> findByShopIdAndProductId(Long shopId, Long productId);

    List<ShopProductConfig> findByShopId(Long shopId);

    List<ShopProductConfig> findByShopIdAndProductIdIn(Long shopId, List<Long> productIds);
}
