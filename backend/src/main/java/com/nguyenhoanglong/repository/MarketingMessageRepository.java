package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.MarketingMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface MarketingMessageRepository extends JpaRepository<MarketingMessage, Long> {

    boolean existsByUserIdAndKind(String userId, MarketingMessage.Kind kind);

    boolean existsByUserIdAndKindAndCreatedAtAfter(String userId, MarketingMessage.Kind kind, LocalDateTime after);

    List<MarketingMessage> findByCampaignId(Long campaignId);

    @Query("SELECT COUNT(m) FROM MarketingMessage m WHERE m.campaignId = :campaignId AND m.status = :status")
    long countByCampaignAndStatus(@Param("campaignId") Long campaignId, @Param("status") String status);
}
