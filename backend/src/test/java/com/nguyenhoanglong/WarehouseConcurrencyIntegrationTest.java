package com.nguyenhoanglong;

import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import com.nguyenhoanglong.service.WarehouseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("test")
public class WarehouseConcurrencyIntegrationTest {

    @Autowired
    private WarehouseService warehouseService;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private StockReservationRepository reservationRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private InventoryAdjustmentRepository adjustmentRepository;

    @BeforeEach
    void setUp() {
        reservationRepository.deleteAll();
        adjustmentRepository.deleteAll();
        inventoryRepository.deleteAll();
    }

    @Test
    @DisplayName("P3-1: Concurrent inbound operations on same SKU must be serialized without lost updates")
    void testConcurrentInboundOperations() throws InterruptedException {
        Long productId = 9999L;
        // Initial setup
        Inventory inv = new Inventory();
        inv.setProductId(productId);
        inv.setProductName("Áo Sơ Mi Concurrency");
        inv.setQuantityOnHand(100);
        inv.setQuantityReserved(0);
        inv.setWarehouseLocation("SEC-A");
        inventoryRepository.save(inv);

        int threadCount = 10;
        int incrementPerThread = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch endLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    warehouseService.inbound(productId, "Áo Sơ Mi Concurrency", incrementPerThread, "SEC-A");
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    endLatch.countDown();
                }
            });
        }

        startLatch.countDown(); // Release threads simultaneously
        boolean completed = endLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertEquals(true, completed, "All threads should finish execution within timeout");
        assertEquals(threadCount, successCount.get(), "All inbound calls should succeed");

        Inventory updatedInventory = inventoryRepository.findByProductId(productId).orElseThrow();
        assertEquals(100 + (threadCount * incrementPerThread), updatedInventory.getQuantityOnHand(),
                "Quantity on hand must be exactly initial + total increments without lost updates");
    }

    @Test
    @DisplayName("P3-1: Concurrent stock reservations approval must strictly update reserved stock safely")
    void testConcurrentReservationApprovals() throws InterruptedException {
        Long productId = 8888L;
        Inventory inv = new Inventory();
        inv.setProductId(productId);
        inv.setProductName("Quần Jean Concurrency");
        inv.setQuantityOnHand(50);
        inv.setQuantityReserved(0);
        inv.setWarehouseLocation("SEC-B");
        inventoryRepository.save(inv);

        Order testOrder = new Order();
        testOrder.setOrderCode("ORD-RES-" + System.currentTimeMillis());
        testOrder.setCustomerName("Khách Hàng Test");
        testOrder.setCustomerPhone("0988776655");
        testOrder.setShippingAddressSnapshot("Address");
        testOrder.setTotalAmount(100000.0);
        testOrder.setStatus(OrderStatus.PENDING_CONFIRMATION);
        Order savedOrder = orderRepository.save(testOrder);

        int reservationCount = 5;
        List<Long> reservationIds = new ArrayList<>();
        for (int i = 0; i < reservationCount; i++) {
            StockReservation res = new StockReservation();
            res.setOrder(savedOrder);
            res.setProductId(productId);
            res.setQuantity(10);
            res.setStatus(ReservationStatus.PENDING);
            reservationIds.add(reservationRepository.save(res).getId());
        }

        ExecutorService executor = Executors.newFixedThreadPool(reservationCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch endLatch = new CountDownLatch(reservationCount);
        AtomicInteger successCount = new AtomicInteger(0);

        for (Long resId : reservationIds) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    warehouseService.approveReservation(resId);
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    endLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean completed = endLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertEquals(true, completed);
        assertEquals(reservationCount, successCount.get());

        // Redesigned: approveReservation only records approval of the hold request;
        // it no longer touches inventories.quantity_reserved itself. That number is
        // now reserved exactly once, when picking actually starts (WarehouseService
        // #startPicking), so approving N hold requests for the same order can never
        // double-book the same stock the way the old code did (it used to add
        // quantity_reserved on approval AND again on picking).
        Inventory updatedInventory = inventoryRepository.findByProductId(productId).orElseThrow();
        assertEquals(0, updatedInventory.getQuantityReserved(),
                "Approval must not move inventory itself; reservation happens once, at picking");

        long approvedCount = reservationIds.stream()
                .map(id -> reservationRepository.findById(id).orElseThrow())
                .filter(r -> r.getStatus() == ReservationStatus.APPROVED)
                .count();
        assertEquals(reservationCount, approvedCount,
                "Every reservation row must reach APPROVED with no lost updates under concurrency");
    }
}
