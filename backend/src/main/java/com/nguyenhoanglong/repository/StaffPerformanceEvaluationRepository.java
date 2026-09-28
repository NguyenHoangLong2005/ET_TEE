package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.StaffPerformanceEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StaffPerformanceEvaluationRepository extends JpaRepository<StaffPerformanceEvaluation, Long> {

    List<StaffPerformanceEvaluation> findByShopIdAndEvaluationPeriod(Long shopId, String evaluationPeriod);

    Optional<StaffPerformanceEvaluation> findByShopIdAndUserIdAndEvaluationPeriod(Long shopId, String userId, String evaluationPeriod);

    List<StaffPerformanceEvaluation> findByShopIdAndUserId(Long shopId, String userId);

    List<StaffPerformanceEvaluation> findByShopId(Long shopId);
}
