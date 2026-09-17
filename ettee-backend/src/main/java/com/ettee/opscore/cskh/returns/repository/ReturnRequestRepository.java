package com.ettee.opscore.cskh.returns.repository;

import com.ettee.opscore.cskh.returns.entity.ReturnRequest;
import com.ettee.opscore.cskh.returns.entity.ReturnStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, UUID> {
    Page<ReturnRequest> findAllByStatusOrderByCreatedAtDesc(ReturnStatus status, Pageable pageable);
    Page<ReturnRequest> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<ReturnRequest> findAllByOrderId(UUID orderId);
}
