package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.SupportTicket;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupportTicketRepository extends JpaRepository<SupportTicket, String> {

    Optional<SupportTicket> findByIdAndCustomerId(String id, String customerId);

    Page<SupportTicket> findByCustomerIdOrderByCreatedAtDesc(String customerId, Pageable pageable);

    List<SupportTicket> findByCustomerIdOrderByCreatedAtDesc(String customerId);

    @Query("SELECT t FROM SupportTicket t WHERE " +
           "(:shopIdIsFilter = false OR t.shopId = :shopId) AND " +
           "(:status IS NULL OR t.status = :status) AND " +
           "(:priority IS NULL OR t.priority = :priority) AND " +
           "(:assignedTo IS NULL OR t.assignedTo = :assignedTo) AND " +
           "(:search IS NULL OR LOWER(t.ticketCode) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(t.subject) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(t.customerId) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<SupportTicket> findStaffTickets(
            @Param("shopIdIsFilter") boolean shopIdIsFilter,
            @Param("shopId") Long shopId,
            @Param("status") String status,
            @Param("priority") Integer priority,
            @Param("assignedTo") String assignedTo,
            @Param("search") String search,
            Pageable pageable
    );

    boolean existsByTicketCode(String ticketCode);
}
