package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.MarketingSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MarketingSubscriptionRepository extends JpaRepository<MarketingSubscription, Long> {
    Optional<MarketingSubscription> findByEmailIgnoreCase(String email);

    Optional<MarketingSubscription> findByUnsubscribeToken(String token);

    long countByStatus(String status);
}
