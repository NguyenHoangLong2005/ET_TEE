package com.ettee.opscore.cskh.ticket.repository;

import com.ettee.opscore.cskh.ticket.entity.SupportCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public interface SupportCodeRepository extends JpaRepository<SupportCode, UUID> {

    @Query("select coalesce(sum(s.value),0) from SupportCode s " +
           "where s.issuedBy = :userId and s.issuedAt between :dayStart and :dayEnd " +
           "and s.approvalStatus <> 'rejected'")
    BigDecimal sumIssuedToday(@Param("userId") UUID userId, @Param("dayStart") Instant dayStart, @Param("dayEnd") Instant dayEnd);
}
