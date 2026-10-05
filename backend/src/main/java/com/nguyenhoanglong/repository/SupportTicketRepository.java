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

    @Query(value = "SELECT t FROM SupportTicket t WHERE " +
           "(:shopIdIsFilter = false OR t.shopId = :shopId) AND " +
           "(:status IS NULL OR t.status = :status) AND " +
           "(:priority IS NULL OR t.priority = :priority) AND " +
           "(:assignedTo IS NULL OR t.assignedTo = :assignedTo) AND " +
           // :search is '' rather than NULL when absent: a NULL String binds as bytea on PostgreSQL
           // and LOWER(bytea) fails ("function lower(bytea) does not exist"), breaking the page.
           "(:search = '' OR LOWER(t.ticketCode) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(t.subject) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(t.customerId) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           // Hang doi CSKH: ticket con mo len truoc, cu nhat truoc (FIFO);
           // ticket da xong (RESOLVED/CLOSED) xuong cuoi, moi nhat truoc.
           "ORDER BY CASE WHEN t.status IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END ASC, " +
           "CASE WHEN t.status IN ('RESOLVED', 'CLOSED') THEN NULL ELSE t.createdAt END ASC, " +
           "t.createdAt DESC, t.id ASC",
           countQuery = "SELECT COUNT(t) FROM SupportTicket t WHERE " +
           "(:shopIdIsFilter = false OR t.shopId = :shopId) AND " +
           "(:status IS NULL OR t.status = :status) AND " +
           "(:priority IS NULL OR t.priority = :priority) AND " +
           "(:assignedTo IS NULL OR t.assignedTo = :assignedTo) AND " +
           "(:search = '' OR LOWER(t.ticketCode) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(t.subject) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(t.customerId) LIKE LOWER(CONCAT('%', :search, '%')))")
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
