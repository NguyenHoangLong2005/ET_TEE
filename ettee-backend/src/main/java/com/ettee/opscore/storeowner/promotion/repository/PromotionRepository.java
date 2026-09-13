package com.ettee.opscore.storeowner.promotion.repository;

import com.ettee.opscore.storeowner.promotion.entity.Promotion;
import com.ettee.opscore.storeowner.promotion.entity.PromotionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PromotionRepository extends JpaRepository<Promotion, UUID> {
    Page<Promotion> findAllByStatusOrderByStartAtDesc(PromotionStatus status, Pageable pageable);
    Page<Promotion> findAllByOrderByStartAtDesc(Pageable pageable);
    Optional<Promotion> findByCode(String code);
    boolean existsByCode(String code);
}
