package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.Campaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CampaignRepository extends JpaRepository<Campaign, Long> {

    Optional<Campaign> findByCode(String code);

    @Query("SELECT c FROM Campaign c " +
           "WHERE (c.status IS NULL OR c.status = 'ACTIVE') " +
           "AND (c.startDate IS NULL OR c.startDate <= :now) " +
           "AND (c.endDate IS NULL OR c.endDate >= :now)")
    List<Campaign> findAllActive(@Param("now") LocalDateTime now);
}
