package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.CampaignAnalytics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for campaign analytics.
 *
 * IMPORTANT: NEVER use "(:since IS NULL OR ..." patterns in queries. PostgreSQL's JDBC driver
 * cannot infer the parameter type when the parameter is null, which produces:
 *   ERROR: could not determine data type of parameter $N
 * Instead, split into two methods (with/without date filter) and call the right one.
 */
@Repository
public interface CampaignAnalyticsRepository extends JpaRepository<CampaignAnalytics, Long> {

    /** For per-campaign analytics WITH optional date filter. Caller chooses which method to invoke. */
    @Query("SELECT ca.eventType, COUNT(ca) FROM CampaignAnalytics ca " +
           "WHERE ca.campaignId = :campaignId " +
           "AND ca.createdAt >= :since " +
           "GROUP BY ca.eventType")
    List<Object[]> countByEventTypeSince(@Param("campaignId") Long campaignId,
                                         @Param("since") LocalDateTime since);

    @Query("SELECT ca.eventType, COUNT(ca) FROM CampaignAnalytics ca " +
           "WHERE ca.campaignId = :campaignId " +
           "GROUP BY ca.eventType")
    List<Object[]> countByEventType(@Param("campaignId") Long campaignId);

    /** All-campaign overview. campaignIdSentinel = -1 means "all campaigns". */
    @Query("SELECT ca.eventType, COUNT(ca) FROM CampaignAnalytics ca " +
           "WHERE (:campaignIdSentinel = -1 OR ca.campaignId = :campaignIdSentinel) " +
           "AND ca.createdAt >= :since " +
           "GROUP BY ca.eventType")
    List<Object[]> countByEventTypeOverviewSince(@Param("campaignIdSentinel") Long campaignIdSentinel,
                                                 @Param("since") LocalDateTime since);

    @Query("SELECT ca.eventType, COUNT(ca) FROM CampaignAnalytics ca " +
           "WHERE (:campaignIdSentinel = -1 OR ca.campaignId = :campaignIdSentinel) " +
           "GROUP BY ca.eventType")
    List<Object[]> countByEventTypeOverview(@Param("campaignIdSentinel") Long campaignIdSentinel);

    @Query("SELECT COUNT(ca) FROM CampaignAnalytics ca " +
           "WHERE ca.campaignId = :campaignId AND ca.eventType = :eventType")
    long countByCampaignIdAndEventType(@Param("campaignId") Long campaignId,
                                       @Param("eventType") String eventType);

    @Query("SELECT COALESCE(SUM(ca.revenue), 0) FROM CampaignAnalytics ca " +
           "WHERE ca.campaignId = :campaignId AND ca.eventType = 'CONVERSION'")
    BigDecimal sumRevenueByCampaign(@Param("campaignId") Long campaignId);

    @Query("SELECT COALESCE(SUM(ca.revenue), 0) FROM CampaignAnalytics ca " +
           "WHERE ca.createdAt >= :since " +
           "AND ca.eventType = 'CONVERSION'")
    BigDecimal sumRevenueSince(@Param("since") LocalDateTime since);

    @Query("SELECT COALESCE(SUM(ca.revenue), 0) FROM CampaignAnalytics ca " +
           "WHERE ca.eventType = 'CONVERSION'")
    BigDecimal sumRevenueAll();

    @Query("SELECT ca.bannerId, COUNT(ca) FROM CampaignAnalytics ca " +
           "WHERE ca.bannerId IS NOT NULL " +
           "AND ca.createdAt >= :since " +
           "GROUP BY ca.bannerId ORDER BY COUNT(ca) DESC")
    List<Object[]> topBannersSince(@Param("since") LocalDateTime since);

    @Query("SELECT ca.bannerId, COUNT(ca) FROM CampaignAnalytics ca " +
           "WHERE ca.bannerId IS NOT NULL " +
           "GROUP BY ca.bannerId ORDER BY COUNT(ca) DESC")
    List<Object[]> topBanners();

    @Query("SELECT ca.campaignId, COUNT(ca) FROM CampaignAnalytics ca " +
           "WHERE ca.campaignId IS NOT NULL " +
           "AND ca.createdAt >= :since " +
           "GROUP BY ca.campaignId ORDER BY COUNT(ca) DESC")
    List<Object[]> topCampaignsSince(@Param("since") LocalDateTime since);

    @Query("SELECT ca.campaignId, COUNT(ca) FROM CampaignAnalytics ca " +
           "WHERE ca.campaignId IS NOT NULL " +
           "GROUP BY ca.campaignId ORDER BY COUNT(ca) DESC")
    List<Object[]> topCampaigns();
}
