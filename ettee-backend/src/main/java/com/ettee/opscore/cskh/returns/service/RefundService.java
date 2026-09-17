package com.ettee.opscore.cskh.returns.service;

import com.ettee.opscore.cskh.payment.entity.Payment;
import com.ettee.opscore.cskh.payment.repository.PaymentRepository;
import com.ettee.opscore.cskh.returns.dto.CreateRefundRequest;
import com.ettee.opscore.cskh.returns.dto.RefundDto;
import com.ettee.opscore.cskh.returns.entity.Refund;
import com.ettee.opscore.cskh.returns.repository.RefundRepository;
import com.ettee.opscore.common.exception.AppExceptions;
import com.ettee.opscore.order.entity.Order;
import com.ettee.opscore.order.entity.PaymentStatus;
import com.ettee.opscore.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Nghiệp vụ "Xử lý hoàn tiền" — permission refund.process (thường là cấp CSKH trưởng/kế toán). */
@Service
@RequiredArgsConstructor
public class RefundService {

    private final RefundRepository refundRepository;
    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;

    @Transactional(readOnly = true)
    public List<RefundDto> listByOrder(UUID orderId) {
        return refundRepository.findAllByOrderId(orderId).stream().map(this::toDto).toList();
    }

    @Transactional
    public RefundDto process(UUID orderId, CreateRefundRequest request, UUID actorId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Đơn hàng", orderId));

        Payment payment = paymentRepository.findById(request.paymentId())
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Giao dịch thanh toán", request.paymentId()));
        if (!payment.getOrderId().equals(orderId)) {
            throw new AppExceptions.BusinessRuleViolationException("Giao dịch thanh toán không thuộc đơn hàng này");
        }
        if (!"success".equals(payment.getStatus())) {
            throw new AppExceptions.BusinessRuleViolationException("Chỉ hoàn tiền được cho giao dịch đã thanh toán thành công");
        }
        if (request.amount().compareTo(payment.getAmount()) > 0) {
            throw new AppExceptions.BusinessRuleViolationException("Số tiền hoàn không được vượt số tiền đã thanh toán");
        }

        Refund refund = new Refund();
        refund.setReturnRequestId(request.returnRequestId());
        refund.setOrderId(orderId);
        refund.setPaymentId(request.paymentId());
        refund.setAmount(request.amount());
        refund.setMethod(order.getPaymentMethod());
        refund.setStatus("success");
        refund.setProcessedBy(actorId);
        refund.setProcessedAt(Instant.now());
        Refund saved = refundRepository.save(refund);

        boolean isFullRefund = request.amount().compareTo(payment.getAmount()) == 0;
        order.setPaymentStatus(isFullRefund ? PaymentStatus.refunded : PaymentStatus.partial_refunded);
        orderRepository.save(order);

        return toDto(saved);
    }

    private RefundDto toDto(Refund r) {
        return new RefundDto(r.getId(), r.getReturnRequestId(), r.getOrderId(), r.getPaymentId(), r.getAmount(),
                r.getMethod(), r.getStatus(), r.getProviderRef(), r.getProcessedBy(), r.getProcessedAt());
    }
}
