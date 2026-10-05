package com.nguyenhoanglong;

import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import com.nguyenhoanglong.service.ShippingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Each shipping step must only run from the step before it: handover, exceptions and
 * waybill edits used to accept any shipment status, so a delivered parcel could be
 * pushed back into the flow.
 */
@SpringBootTest
@ActiveProfiles("test")
public class ShippingFlowGuardsIntegrationTest {

    @Autowired private ShippingService shippingService;
    @Autowired private UserRepository userRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private ShipmentRepository shipmentRepository;

    private User staff() {
        User user = new User();
        user.setEmail("ship_guard_" + System.nanoTime() + "@ettee.vn");
        user.setFullName("Guard Tester");
        user.setPasswordHash("hashed_pwd");
        user.setStatus("ACTIVE");
        user.setRole(Role.SHIPPING_STAFF);
        user.setShopId(1L);
        return userRepository.save(user);
    }

    private Shipment shipment(OrderStatus orderStatus, ShipmentStatus shipmentStatus) {
        Order order = new Order();
        order.setOrderCode("ORD-GUARD-" + System.nanoTime());
        order.setCustomerName("Khách");
        order.setCustomerPhone("0988776655");
        order.setShippingAddressSnapshot("Số 1, Quận 1, TP. HCM");
        order.setOrderStatus(orderStatus.name());
        order.setStatus(orderStatus);
        order.setPaymentMethod("COD");
        order.setPaymentStatus("UNPAID");
        order.setTotalAmount(500000.0);
        order.setShopId(1L);
        order = orderRepository.save(order);

        Shipment s = new Shipment();
        s.setOrder(order);
        s.setCarrierName("GHN");
        s.setTrackingCode("TRK-GUARD-" + System.nanoTime());
        s.setCodAmount(new BigDecimal("500000"));
        s.setStatus(shipmentStatus);
        return shipmentRepository.save(s);
    }

    private static void assertBadRequest(org.junit.jupiter.api.function.Executable call) {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, call);
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    @Transactional
    @DisplayName("Delivered parcel cannot be handed over, re-coded or flagged with an exception")
    void deliveredShipmentIsFinal() {
        User actor = staff();
        Shipment s = shipment(OrderStatus.DELIVERED, ShipmentStatus.DELIVERED);

        assertBadRequest(() -> shippingService.handover(actor, s.getId()));
        assertBadRequest(() -> shippingService.updateTrackingCode(actor, s.getId(), "TRK-NEW-" + System.nanoTime()));
        assertBadRequest(() -> shippingService.addException(actor, s.getId(), "LOST", "x"));
        assertEquals(ShipmentStatus.DELIVERED, shipmentRepository.findById(s.getId()).orElseThrow().getStatus());
    }

    @Test
    @Transactional
    @DisplayName("Handover runs once and only while the order is still with the carrier desk")
    void handoverPreconditions() {
        User actor = staff();
        Shipment s = shipment(OrderStatus.HANDED_TO_CARRIER, ShipmentStatus.PENDING);
        shippingService.handover(actor, s.getId());
        assertBadRequest(() -> shippingService.handover(actor, s.getId()));

        Shipment cancelled = shipment(OrderStatus.CANCELLED, ShipmentStatus.PENDING);
        assertBadRequest(() -> shippingService.handover(actor, cancelled.getId()));
    }

    @Test
    @Transactional
    @DisplayName("Resolving an exception on a parcel never handed over returns it to PENDING")
    void resolveBeforeHandoverKeepsHandoverStep() {
        User actor = staff();
        Shipment s = shipment(OrderStatus.HANDED_TO_CARRIER, ShipmentStatus.PENDING);
        ShippingException e = shippingService.addException(actor, s.getId(), "DAMAGED", "Móp hộp");
        assertBadRequest(() -> shippingService.addException(actor, s.getId(), "DAMAGED", "lần 2"));

        shippingService.resolveException(actor, e.getId(), "Đóng gói lại");
        assertEquals(ShipmentStatus.PENDING, shipmentRepository.findById(s.getId()).orElseThrow().getStatus());
    }

    @Test
    @Transactional
    @DisplayName("Proof of delivery needs a receiver; a cancelled order cannot be delivered (400, not 500)")
    void deliveredPreconditions() {
        User actor = staff();
        Shipment s = shipment(OrderStatus.SHIPPING, ShipmentStatus.IN_TRANSIT);
        assertBadRequest(() -> shippingService.delivered(actor, s.getId(), " ", null, null));

        Shipment orphan = shipment(OrderStatus.CANCELLED, ShipmentStatus.IN_TRANSIT);
        assertBadRequest(() -> shippingService.delivered(actor, orphan.getId(), "Anh A", null, null));
    }
}
