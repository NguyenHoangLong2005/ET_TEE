package com.ettee.opscore.cskh.returns.repository;

import com.ettee.opscore.cskh.returns.entity.Refund;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RefundRepository extends JpaRepository<Refund, UUID> {
    List<Refund> findAllByOrderId(UUID orderId);
    List<Refund> findAllByReturnRequestId(UUID returnRequestId);
}
