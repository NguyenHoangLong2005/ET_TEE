package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.GoodsReceipt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GoodsReceiptRepository extends JpaRepository<GoodsReceipt, Long> {
    List<GoodsReceipt> findTop200ByOrderByCreatedAtDesc();

    List<GoodsReceipt> findTop200ByShopIdOrderByCreatedAtDesc(Long shopId);
}
