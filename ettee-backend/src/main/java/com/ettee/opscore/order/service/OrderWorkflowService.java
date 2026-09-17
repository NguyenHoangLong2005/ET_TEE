package com.ettee.opscore.order.service;

import com.ettee.opscore.common.exception.AppExceptions;
import com.ettee.opscore.order.dto.ChangeOrderStatusRequest;
import com.ettee.opscore.order.entity.Order;
import com.ettee.opscore.order.repository.OrderRepository;
import com.ettee.opscore.security.JwtPrincipal;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderWorkflowService {
    private final OrderRepository orderRepository;
    private final EntityManager entityManager;

    @Transactional
    public Order change(UUID orderId, ChangeOrderStatusRequest request, JwtPrincipal actor) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Đơn hàng", orderId));

        entityManager.createNativeQuery("select set_config('ettee.actor_id', :actor, true)")
                .setParameter("actor", actor.userId().toString())
                .getSingleResult();
        entityManager.createNativeQuery("select set_config('ettee.order_note', :note, true)")
                .setParameter("note", request.note() == null ? "" : request.note())
                .getSingleResult();
        entityManager.createNativeQuery(
                "select ettee.change_order_status(:id, :version, cast(:status as ettee.order_status), :actor, :note)")
                .setParameter("id", orderId)
                .setParameter("version", request.expectedVersion())
                .setParameter("status", request.status().name())
                .setParameter("actor", actor.userId())
                .setParameter("note", request.note())
                .getSingleResult();

        return orderRepository.findById(orderId).orElse(order);
    }
}