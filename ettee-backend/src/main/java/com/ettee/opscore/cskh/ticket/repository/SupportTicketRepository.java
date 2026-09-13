package com.ettee.opscore.cskh.ticket.repository;

import com.ettee.opscore.cskh.ticket.entity.SupportTicket;
import com.ettee.opscore.cskh.ticket.entity.TicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, UUID> {

    @Query("""
           select t from SupportTicket t
           where (:status is null or t.status = :status)
             and (:assignedTo is null or t.assignedTo = :assignedTo)
           order by t.priority asc, t.createdAt asc
           """)
    Page<SupportTicket> search(@Param("status") TicketStatus status, @Param("assignedTo") UUID assignedTo, Pageable pageable);
}
