package com.nguyenhoanglong;

import com.nguyenhoanglong.dto.*;
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
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class CodReconciliationIntegrationTest {

    @Autowired
    private ShippingService shippingService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ShipmentRepository shipmentRepository;

    @Autowired
    private CodReconciliationRepository codReconciliationRepository;

    @Autowired
    private CodReconciliationItemRepository codReconciliationItemRepository;

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
        order.setOrderCode("ORD-COD-" + System.currentTimeMillis() + "-" + (int)(Math.random()*1000));
        order.setCustomerName(customerName);
        order.setCustomerPhone("0911223344");
        order.setShippingAddressSnapshot("Số 456 Đường Lê Lợi, Quận 1, TP. HCM");
        order.setOrderStatus(status.name());
        order.setStatus(status);
        order.setPaymentMethod("COD");
        order.setPaymentStatus("UNPAID");
        order.setTotalAmount(500000.0);
        order.setShopId(shopId);
        return orderRepository.save(order);
    }

    private Shipment createShipment(Order order, ShipmentStatus status, BigDecimal codAmount) {
        Shipment s = new Shipment();
        s.setOrder(order);
        s.setCarrierName("GHN");
        s.setTrackingCode("TRK-COD-" + System.currentTimeMillis() + "-" + (int)(Math.random()*1000));
        s.setCodAmount(codAmount);
        s.setStatus(status);
        s.setCodReconciled(false);
        return shipmentRepository.save(s);
    }

    @Test
    @Transactional
    @DisplayName("Test 1: Happy Path - Same Shop COD Reconciliation Sheet Creation")
    public void test1_HappyPath_SameShopReconciliation() {
        User staffShop1 = createUser("cod_staff1_" + System.currentTimeMillis() + "@ettee.vn", Role.SHIPPING_STAFF, 1L);
        Order o1 = createOrder("Khách 1", 1L, OrderStatus.DELIVERED);
        Order o2 = createOrder("Khách 2", 1L, OrderStatus.DELIVERED);

        Shipment s1 = createShipment(o1, ShipmentStatus.DELIVERED, new BigDecimal("300000.00"));
        Shipment s2 = createShipment(o2, ShipmentStatus.DELIVERED, new BigDecimal("450000.00"));

        CreateCodReconciliationDto req = new CreateCodReconciliationDto(List.of(s1.getId(), s2.getId()), "Đợt 1 chiều nay");
        CodReconciliationDto result = shippingService.createCodReconciliation(staffShop1, req);

        assertNotNull(result);
        assertNotNull(result.getId());
        assertTrue(result.getReconciliationCode().startsWith("COD-REC-"));
        assertEquals(Long.valueOf(1L), result.getShopId());
        assertEquals(new BigDecimal("750000.00"), result.getTotalCodAmount());
        assertEquals(2, result.getItemCount());
        assertEquals(staffShop1.getEmail(), result.getReconciledBy());

        // Verify DB persistence
        CodReconciliation dbRec = codReconciliationRepository.findById(result.getId()).orElse(null);
        assertNotNull(dbRec);
        assertEquals(2, dbRec.getItems().size());

        Shipment updatedS1 = shipmentRepository.findById(s1.getId()).orElse(null);
        assertTrue(updatedS1.getCodReconciled());
    }

    @Test
    @Transactional
    @DisplayName("Test 2: Cross-Shop IDOR Protection -> 403 Forbidden")
    public void test2_CrossShopIdor_Forbidden() {
        User staffShop1 = createUser("cod_idor1_" + System.currentTimeMillis() + "@ettee.vn", Role.SHIPPING_STAFF, 1L);
        Order oShop2 = createOrder("Khách Shop 2", 2L, OrderStatus.DELIVERED);
        Shipment sShop2 = createShipment(oShop2, ShipmentStatus.DELIVERED, new BigDecimal("500000.00"));

        CreateCodReconciliationDto req = new CreateCodReconciliationDto(List.of(sShop2.getId()), "Thử đối soát chéo shop");
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            shippingService.createCodReconciliation(staffShop1, req);
        });
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    @Transactional
    @DisplayName("Test 3: Server Side Financial Total Calculation & Client Total Ignored")
    public void test3_ServerCalculatedTotal() {
        User staffShop1 = createUser("cod_calc_" + System.currentTimeMillis() + "@ettee.vn", Role.SHIPPING_STAFF, 1L);
        Order o1 = createOrder("Khách A", 1L, OrderStatus.DELIVERED);
        Shipment s1 = createShipment(o1, ShipmentStatus.DELIVERED, new BigDecimal("250000.00"));

        CreateCodReconciliationDto req = new CreateCodReconciliationDto(List.of(s1.getId()), "Test Total");
        CodReconciliationDto result = shippingService.createCodReconciliation(staffShop1, req);

        assertEquals(new BigDecimal("250000.00"), result.getTotalCodAmount());
    }

    @Test
    @Transactional
    @DisplayName("Test 4: Non-existent Shipment -> 404 Not Found")
    public void test4_NonExistentShipment() {
        User staffShop1 = createUser("cod_404_" + System.currentTimeMillis() + "@ettee.vn", Role.SHIPPING_STAFF, 1L);
        CreateCodReconciliationDto req = new CreateCodReconciliationDto(List.of(999999L), "Test Non-existent");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            shippingService.createCodReconciliation(staffShop1, req);
        });
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    @Transactional
    @DisplayName("Test 5: Undelivered Shipment -> 400 Bad Request")
    public void test5_UndeliveredShipment() {
        User staffShop1 = createUser("cod_status_" + System.currentTimeMillis() + "@ettee.vn", Role.SHIPPING_STAFF, 1L);
        Order oPending = createOrder("Khách Pending", 1L, OrderStatus.HANDED_TO_CARRIER);
        Shipment sPending = createShipment(oPending, ShipmentStatus.PENDING, new BigDecimal("300000.00"));

        CreateCodReconciliationDto req = new CreateCodReconciliationDto(List.of(sPending.getId()), "Test Pending");
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            shippingService.createCodReconciliation(staffShop1, req);
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("GIAO THÀNH CÔNG"));
    }

    @Test
    @Transactional
    @DisplayName("Test 6: Zero/Null COD Amount -> 400 Bad Request")
    public void test6_ZeroCodAmount() {
        User staffShop1 = createUser("cod_zero_" + System.currentTimeMillis() + "@ettee.vn", Role.SHIPPING_STAFF, 1L);
        Order oZero = createOrder("Khách Zero", 1L, OrderStatus.DELIVERED);
        Shipment sZero = createShipment(oZero, ShipmentStatus.DELIVERED, BigDecimal.ZERO);

        CreateCodReconciliationDto req = new CreateCodReconciliationDto(List.of(sZero.getId()), "Test Zero COD");
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            shippingService.createCodReconciliation(staffShop1, req);
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("không có tiền thu hộ"));
    }

    @Test
    @Transactional
    @DisplayName("Test 7: Double Reconciliation Blocked -> 400 Bad Request")
    public void test7_DoubleReconciliationBlocked() {
        User staffShop1 = createUser("cod_dup_" + System.currentTimeMillis() + "@ettee.vn", Role.SHIPPING_STAFF, 1L);
        Order o = createOrder("Khách Repeat", 1L, OrderStatus.DELIVERED);
        Shipment s = createShipment(o, ShipmentStatus.DELIVERED, new BigDecimal("100000.00"));

        // Reconcile once
        shippingService.createCodReconciliation(staffShop1, new CreateCodReconciliationDto(List.of(s.getId()), "First Reconcile"));

        // Reconcile second time -> 400 Bad Request
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            shippingService.createCodReconciliation(staffShop1, new CreateCodReconciliationDto(List.of(s.getId()), "Second Reconcile"));
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("đã được đối soát"));
    }

    @Test
    @Transactional
    @DisplayName("Test 8: Request with Duplicate IDs Normalized Cleanly")
    public void test8_DuplicateIdsInRequest() {
        User staffShop1 = createUser("cod_dup_req_" + System.currentTimeMillis() + "@ettee.vn", Role.SHIPPING_STAFF, 1L);
        Order o = createOrder("Khách Dup Req", 1L, OrderStatus.DELIVERED);
        Shipment s = createShipment(o, ShipmentStatus.DELIVERED, new BigDecimal("200000.00"));

        // Duplicate IDs in payload: [s.getId(), s.getId()]
        CodReconciliationDto result = shippingService.createCodReconciliation(staffShop1, new CreateCodReconciliationDto(List.of(s.getId(), s.getId()), "Dup Payload"));
        assertNotNull(result);
        assertEquals(1, result.getItemCount());
        assertEquals(new BigDecimal("200000.00"), result.getTotalCodAmount());
    }

    @Test
    @Transactional
    @DisplayName("Test 9: Empty Shipment List -> 400 Bad Request")
    public void test9_EmptyShipmentList() {
        User staffShop1 = createUser("cod_empty_" + System.currentTimeMillis() + "@ettee.vn", Role.SHIPPING_STAFF, 1L);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            shippingService.createCodReconciliation(staffShop1, new CreateCodReconciliationDto(Collections.emptyList(), "Empty"));
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    @Transactional
    @DisplayName("Test 10: Backward Compatibility with Single Shipment Reconcile Endpoint")
    public void test10_BackwardCompatibilitySingleReconcile() {
        User staffShop1 = createUser("cod_compat_" + System.currentTimeMillis() + "@ettee.vn", Role.SHIPPING_STAFF, 1L);
        Order o = createOrder("Khách Compat", 1L, OrderStatus.DELIVERED);
        Shipment s = createShipment(o, ShipmentStatus.DELIVERED, new BigDecimal("600000.00"));

        Shipment reconciled = shippingService.reconcileCod(staffShop1, s.getId());
        assertNotNull(reconciled);
        assertTrue(reconciled.getCodReconciled());

        // Check that a CodReconciliation item was recorded in DB
        assertTrue(codReconciliationItemRepository.existsByShipmentId(s.getId()));
    }

    @Test
    @DisplayName("Test 11: Concurrency & Transaction Atomicity - Concurrent Reconcile Attempts")
    public void test11_ConcurrencyAndTransactionRollback() throws Exception {
        User staffShop1 = createUser("cod_conc_" + System.currentTimeMillis() + "@ettee.vn", Role.SHIPPING_STAFF, 1L);
        Order o = createOrder("Khách Concurrent", 1L, OrderStatus.DELIVERED);
        Shipment s = createShipment(o, ShipmentStatus.DELIVERED, new BigDecimal("350000.00"));

        java.util.concurrent.ExecutorService executor = java.util.concurrent.Executors.newFixedThreadPool(2);
        java.util.concurrent.Callable<Boolean> task = () -> {
            try {
                shippingService.createCodReconciliation(staffShop1, new CreateCodReconciliationDto(List.of(s.getId()), "Concurrent Task"));
                return true;
            } catch (Exception e) {
                return false;
            }
        };

        List<java.util.concurrent.Future<Boolean>> futures = executor.invokeAll(List.of(task, task));
        executor.shutdown();

        int successCount = 0;
        int failureCount = 0;
        for (java.util.concurrent.Future<Boolean> f : futures) {
            if (f.get()) {
                successCount++;
            } else {
                failureCount++;
            }
        }

        // Exactly 1 thread succeeds, 1 thread fails safely
        assertEquals(1, successCount);
        assertEquals(1, failureCount);

        // Verify DB persistence: exactly 1 item and 1 reconciliation
        assertTrue(codReconciliationItemRepository.existsByShipmentId(s.getId()));
    }
}
