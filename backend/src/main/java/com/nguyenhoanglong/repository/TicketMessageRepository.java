package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.TicketMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketMessageRepository extends JpaRepository<TicketMessage, String> {

    List<TicketMessage> findByTicketIdOrderByCreatedAtAsc(String ticketId);

    Optional<TicketMessage> findFirstByTicketIdOrderByCreatedAtDesc(String ticketId);

    void deleteByTicketId(String ticketId);
}
