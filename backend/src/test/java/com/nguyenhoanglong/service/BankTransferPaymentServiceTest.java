package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.Order;
import com.nguyenhoanglong.entity.OrderStatus;
import com.nguyenhoanglong.entity.OrderStatusHistory;
import com.nguyenhoanglong.repository.OrderRepository;
import com.nguyenhoanglong.repository.OrderStatusHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Bank-transfer orders had no path from WAITING_TRANSFER to PAID at all. */
@ExtendWith(MockitoExtension.class)
class BankTransferPaymentServiceTest {

    @Mock private OrderRepository orders;
    @Mock private OrderStatusHistoryRepository historyRepository;
    @Mock private SalesNotificationService notifications;

    private BankTransferPaymentService service;

    @BeforeEach
    void setUp() {
        service = new BankTransferPaymentService(orders, historyRepository, new OrderStateMachine(), notifications);
    }

    private static Order waitingTransfer() {
        Order o = new Order();
        o.setId(7L);
        o.setOrderCode("DH0123456789");
        o.setPaymentMethod("BANK_TRANSFER");
        o.setPaymentStatus("WAITING_TRANSFER");
        o.setStatus(OrderStatus.PENDING_PAYMENT);
        return o;
    }

    @Test
    void marksPaidAndMovesToSalesQueue() {
        when(orders.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        Order saved = service.markPaid(waitingTransfer(), "staff@et.tee", "ok");

        assertThat(saved.getPaymentStatus()).isEqualTo("PAID");
        assertThat(saved.getStatus()).isEqualTo(OrderStatus.PENDING_CONFIRMATION);
        ArgumentCaptor<OrderStatusHistory> history = ArgumentCaptor.forClass(OrderStatusHistory.class);
        verify(historyRepository).save(history.capture());
        assertThat(history.getValue().getFromStatus()).isEqualTo("PENDING_PAYMENT");
        assertThat(history.getValue().getStatus()).isEqualTo("PENDING_CONFIRMATION");
        verify(notifications).notifyNewOrderAwaitingConfirmation(saved);
    }

    @Test
    void alreadyPaidIsANoOp() {
        Order o = waitingTransfer();
        o.setPaymentStatus("PAID");
        o.setStatus(OrderStatus.PENDING_CONFIRMATION);

        service.markPaid(o, "SEPAY", "retry");

        verifyNoInteractions(orders, historyRepository, notifications);
    }

    @Test
    void refusesCancelledOrder() {
        Order o = waitingTransfer();
        o.setStatus(OrderStatus.CANCELLED);

        assertThatThrownBy(() -> service.markPaid(o, "SEPAY", "late"))
                .isInstanceOf(ResponseStatusException.class);
        verify(orders, never()).save(any());
    }

    @Test
    void refusesCodOrder() {
        Order o = waitingTransfer();
        o.setPaymentMethod("COD");

        assertThatThrownBy(() -> service.markPaid(o, "staff", "x"))
                .isInstanceOf(ResponseStatusException.class);
    }
}
