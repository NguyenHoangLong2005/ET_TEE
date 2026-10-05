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
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class ShippingBranchIsolationIntegrationTest {

    @Autowired
    private ShippingService shippingService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ShipmentRepository shipmentRepository;

    @Autowired
    private ShippingExceptionRepository exceptionRepository;

    private User createUser(String email, Role role, Long shopId) {
        User user = new User();
        user.setEmail(email);
        user.setFullName("Test " + role.name());
        user.setPasswordHash("hashed_pwd");
        user.setStatus("ACTIVE");
        user.setRole(role);
        user.setShopId(shopId);
        return userRepository.save(user);
    }

    private Order createOrder(String customerName, Long shopId, OrderStatus status) {
        Order order = new Order();
        order.setOrderCode("ORD-SHIP-" + System.currentTimeMillis() + "-" + (int)(Math.random()*1000));
        order.setCustomerName(customerName);
        order.setCustomerPhone("0988776655");
        order.setShippingAddressSnapshot("Số 123 Đường Vận Chuyển, Quận 1, TP. HCM");
        order.setOrderStatus(status.name());
        order.setStatus(status);
        order.setPaymentMethod("COD");
        order.setPaymentStatus("UNPAID");
        order.setTotalAmount(750000.0);
        order.setShopId(shopId);
        return orderRepository.save(order);
    }

    private Shipment createShipment(Order order, ShipmentStatus status) {
        Shipment s = new Shipment();
        s.setOrder(order);
        s.setCarrierName("GHN");
        s.setTrackingCode("TRK-" + java.util.UUID.randomUUID()); // millis collided when two were created in the same ms
        s.setCodAmount(new BigDecimal("750000"));
        s.setStatus(status);
        return shipmentRepository.save(s);
    }

    @Test
    @Transactional
    @DisplayName("Verify SHIPPING_STAFF of Shop 1 gets 403 Forbidden on ALL operations for Shop 2 Shipments/COD")
    public void testShippingBranchIsolation_AllEndpoints() {
        User staffShop1 = createUser("ship_staff1_" + System.currentTimeMillis() + "@ettee.vn", Role.SHIPPING_STAFF, 1L);
        User staffShop2 = createUser("ship_staff2_" + System.currentTimeMillis() + "@ettee.vn", Role.SHIPPING_STAFF, 2L);

        Order orderShop1 = createOrder("Khách Shop 1", 1L, OrderStatus.HANDED_TO_CARRIER);
        Order orderShop2 = createOrder("Khách Shop 2", 2L, OrderStatus.HANDED_TO_CARRIER);

        Shipment shipmentShop1 = createShipment(orderShop1, ShipmentStatus.PENDING);
        Shipment shipmentShop2 = createShipment(orderShop2, ShipmentStatus.PENDING);

        // 1. Ready Orders & Shipments Listing Isolation
        List<Order> readyOrdersShop1 = shippingService.getReadyOrders(staffShop1);
        assertTrue(readyOrdersShop1.stream().allMatch(o -> Long.valueOf(1L).equals(o.getShopId())));

        List<Shipment> allShipmentsShop1 = shippingService.getAllShipments(staffShop1);
        assertTrue(allShipmentsShop1.stream().allMatch(s -> Long.valueOf(1L).equals(s.getOrder().getShopId())));

        // 2. GET Shipment Detail of Shop 2 -> 403 Forbidden
        ResponseStatusException exGet = assertThrows(ResponseStatusException.class, () -> {
            shippingService.getShipment(staffShop1, shipmentShop2.getId());
        });
        assertEquals(HttpStatus.FORBIDDEN, exGet.getStatusCode());

        // 3. CREATE Shipment for Order of Shop 2 -> 403 Forbidden
        Order orderShop2New = createOrder("Khách Shop 2 New", 2L, OrderStatus.HANDED_TO_CARRIER);
        ResponseStatusException exCreate = assertThrows(ResponseStatusException.class, () -> {
            shippingService.createShipment(staffShop1, orderShop2New.getId(), "GHTK", "TRK-999", new BigDecimal("500000"));
        });
        assertEquals(HttpStatus.FORBIDDEN, exCreate.getStatusCode());

        // 4. UPDATE Tracking Code for Shipment of Shop 2 -> 403 Forbidden
        ResponseStatusException exTracking = assertThrows(ResponseStatusException.class, () -> {
            shippingService.updateTrackingCode(staffShop1, shipmentShop2.getId(), "TRK-UPDATED");
        });
        assertEquals(HttpStatus.FORBIDDEN, exTracking.getStatusCode());

        // 5. HANDOVER Shipment of Shop 2 -> 403 Forbidden
        ResponseStatusException exHandover = assertThrows(ResponseStatusException.class, () -> {
            shippingService.handover(staffShop1, shipmentShop2.getId());
        });
        assertEquals(HttpStatus.FORBIDDEN, exHandover.getStatusCode());

        // 6. START SHIPPING for Shipment of Shop 2 -> 403 Forbidden
        // First handover via staffShop2
        shippingService.handover(staffShop2, shipmentShop2.getId());
        ResponseStatusException exStart = assertThrows(ResponseStatusException.class, () -> {
            shippingService.startShipping(staffShop1, shipmentShop2.getId());
        });
        assertEquals(HttpStatus.FORBIDDEN, exStart.getStatusCode());

        // 7. ADD EXCEPTION for Shipment of Shop 2 -> 403 Forbidden
        ResponseStatusException exAddEx = assertThrows(ResponseStatusException.class, () -> {
            shippingService.addException(staffShop1, shipmentShop2.getId(), "LOST", "Kiện thất lạc");
        });
        assertEquals(HttpStatus.FORBIDDEN, exAddEx.getStatusCode());

        // 8. RESOLVE EXCEPTION of Shop 2 -> 403 Forbidden
        ShippingException excShop2 = shippingService.addException(staffShop2, shipmentShop2.getId(), "DAMAGED", "Hàng móp");
        ResponseStatusException exResolveEx = assertThrows(ResponseStatusException.class, () -> {
            shippingService.resolveException(staffShop1, excShop2.getId(), "Đã bồi thường");
        });
        assertEquals(HttpStatus.FORBIDDEN, exResolveEx.getStatusCode());

        // 9. PROOF OF DELIVERY for Shipment of Shop 2 -> 403 Forbidden
        ResponseStatusException exPod = assertThrows(ResponseStatusException.class, () -> {
            shippingService.delivered(staffShop1, shipmentShop2.getId(), "Anh B", "http://proof.jpg", "Giao thành công");
        });
        assertEquals(HttpStatus.FORBIDDEN, exPod.getStatusCode());

        // 10. RECONCILE COD for Shipment of Shop 2 -> 403 Forbidden
        // addException (step 8) left the shipment in EXCEPTION; resolve it first so
        // it can continue shipping, then complete the realistic transition path
        // (HANDED_TO_CARRIER -> SHIPPING -> DELIVERED) via staffShop2 before
        // delivering; the state machine now enforces this instead of silently
        // allowing HANDED_TO_CARRIER -> DELIVERED.
        shippingService.resolveException(staffShop2, excShop2.getId(), "Đã xử lý");
        shippingService.startShipping(staffShop2, shipmentShop2.getId());
        shippingService.delivered(staffShop2, shipmentShop2.getId(), "Anh B", "http://proof.jpg", "Giao thành công");
        ResponseStatusException exCod = assertThrows(ResponseStatusException.class, () -> {
            shippingService.reconcileCod(staffShop1, shipmentShop2.getId());
        });
        assertEquals(HttpStatus.FORBIDDEN, exCod.getStatusCode());

        // 11. GET Pending COD for Shop 1 -> Excludes Shop 2
        List<Shipment> pendingCodShop1 = shippingService.getPendingCod(staffShop1);
        assertTrue(pendingCodShop1.stream().allMatch(s -> Long.valueOf(1L).equals(s.getOrder().getShopId())));
    }
}
