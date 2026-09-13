package com.ettee.opscore.cskh.payment.repository;

import com.ettee.opscore.cskh.payment.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    List<Payment> findAllByOrderId(UUID orderId);
}
