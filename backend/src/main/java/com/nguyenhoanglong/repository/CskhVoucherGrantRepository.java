package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.CskhVoucherGrant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CskhVoucherGrantRepository extends JpaRepository<CskhVoucherGrant, Long> {
    boolean existsByTicketId(String ticketId);
    List<CskhVoucherGrant> findByTicketId(String ticketId);
}
