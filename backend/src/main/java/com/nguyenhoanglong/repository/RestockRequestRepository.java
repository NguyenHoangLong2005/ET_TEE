package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.RestockRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RestockRequestRepository extends JpaRepository<RestockRequest, Long> {
    List<RestockRequest> findTop200ByOrderByCreatedAtDesc();

    List<RestockRequest> findTop200ByShopIdOrderByCreatedAtDesc(Long shopId);

    boolean existsByInventoryIdAndStatus(Long inventoryId, String status);

    List<RestockRequest> findByShopIdAndStatusOrderByCreatedAtDesc(Long shopId, String status);
}
