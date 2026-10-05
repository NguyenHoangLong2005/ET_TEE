package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.entity.Order;
import com.nguyenhoanglong.entity.OrderStatus;
import com.nguyenhoanglong.repository.OrderRepository;
import com.nguyenhoanglong.service.BankTransferPaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SepayWebhookControllerTest {

    private static final String KEY = "secret-key";

    @Mock private OrderRepository orders;
    @Mock private BankTransferPaymentService payments;

    private SepayWebhookController controller;

    @BeforeEach
    void setUp() {
        controller = new SepayWebhookController(orders, payments, KEY);
    }

    private static Map<String, Object> transfer(String content, Object amount) {
        Map<String, Object> body = new HashMap<>();
        body.put("id", 92704);
        body.put("transferType", "in");
        body.put("transferAmount", amount);
        body.put("content", content);
        return body;
    }

    private static Order order(double total) {
        Order o = new Order();
        o.setOrderCode("DH30AB10D07F");
        o.setPaymentMethod("BANK_TRANSFER");
        o.setPaymentStatus("WAITING_TRANSFER");
        o.setStatus(OrderStatus.PENDING_PAYMENT);
        o.setTotalAmount(total);
        return o;
    }

    @Test
    void refusesWhenNoKeyConfigured() {
        controller = new SepayWebhookController(orders, payments, "");
        assertThat(controller.handle("Apikey anything", transfer("ETTEE DH30AB10D07F", 2000)).getStatusCode().value()).isEqualTo(503);
        verifyNoInteractions(payments);
    }

    @Test
    void refusesWrongKey() {
        assertThat(controller.handle("Apikey wrong", transfer("ETTEE DH30AB10D07F", 2000)).getStatusCode().value()).isEqualTo(401);
        verifyNoInteractions(orders, payments);
    }

    @Test
    void marksMatchingOrderPaid_evenWhenBankMangledTheContent() {
        Order o = order(2000);
        when(orders.findByOrderCode("DH30AB10D07F")).thenReturn(Optional.of(o));

        // Banks often strip spaces and lowercase the transfer description.
        var res = controller.handle("Apikey " + KEY, transfer("MBVCB.123.ettee dh30ab10d07f 0968623156.CT tu", 2000));

        assertThat(res.getStatusCode().value()).isEqualTo(200);
        verify(payments).markPaid(same(o), eq("SEPAY"), contains("92704"));
    }

    @Test
    void underpaymentIsLeftForStaff() {
        when(orders.findByOrderCode("DH30AB10D07F")).thenReturn(Optional.of(order(2000)));

        controller.handle("Apikey " + KEY, transfer("ETTEE DH30AB10D07F", 1000));

        verify(payments, never()).markPaid(any(), any(), any());
    }

    @Test
    void ignoresOutgoingAndUnmatchedTransfers() {
        Map<String, Object> out = transfer("ETTEE DH30AB10D07F", 2000);
        out.put("transferType", "out");
        controller.handle("Apikey " + KEY, out);
        controller.handle("Apikey " + KEY, transfer("tien an trua", 50000));

        verifyNoInteractions(payments);
        verify(orders, never()).findByOrderCode(anyString());
    }
}
