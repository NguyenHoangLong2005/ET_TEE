package com.nguyenhoanglong;

import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import com.nguyenhoanglong.service.ReplenishmentAdvisor;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** Sales pace behind restock suggestions: which orders count, and per branch. */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ReplenishmentSuggestionIntegrationTest {

    @Autowired private ReplenishmentAdvisor advisor;
    @Autowired private ProductRepository productRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private JdbcTemplate jdbc;

    private Order order(Long shopId, OrderStatus status, Product product, int qty) {
        Order o = new Order();
        o.setOrderCode("ORD-RESTOCK-" + System.nanoTime());
        o.setCustomerName("Khách test");
        o.setCustomerPhone("0911223344");
        o.setShippingAddressSnapshot("1 Test");
        o.setStatus(status);
        o.setOrderStatus(status.name());
        o.setPaymentMethod("COD");
        o.setPaymentStatus("UNPAID");
        o.setTotalAmount(100000.0 * qty);
        o.setShopId(shopId);
        OrderItem item = new OrderItem();
        item.setOrder(o);
        item.setProduct(product);
        item.setProductNameSnapshot(product.getName());
        item.setQuantity(qty);
        o.setItems(new ArrayList<>(List.of(item)));
        return orderRepository.saveAndFlush(o);
    }

    @Test
    void countsRecentPlacedOrdersOfTheSameBranchOnly() {
        long sfx = System.nanoTime();
        Product p = new Product();
        p.setName("Áo restock " + sfx);
        p.setSlug("ao-restock-" + sfx);
        p.setPrice(new BigDecimal("100000"));
        p.setStatus("ACTIVE");
        p = productRepository.save(p);

        long shopA = 7_100L + sfx % 100, shopB = shopA + 1;
        order(shopA, OrderStatus.DELIVERED, p, 30);
        order(shopA, OrderStatus.CONFIRMED, p, 15);
        order(shopA, OrderStatus.CANCELLED, p, 500);       // never sold
        order(shopA, OrderStatus.RETURNED, p, 400);        // sent back
        order(shopB, OrderStatus.DELIVERED, p, 200);       // another branch
        Order old = order(shopA, OrderStatus.DELIVERED, p, 300);
        jdbc.update("UPDATE orders SET created_at = ? WHERE id = ?",
                java.sql.Timestamp.valueOf(java.time.LocalDateTime.now().minusDays(45)), old.getId());

        Inventory atA = new Inventory();
        atA.setProductId(p.getId());
        atA.setProductName(p.getName());
        atA.setShopId(shopA);
        atA.setQuantityOnHand(6);
        atA.setQuantityReserved(0);
        atA.setReorderLevel(10);

        var s = advisor.suggest(List.of(atA)).get(0);
        assertEquals(45, s.soldInWindow(), "30 + 15 at branch A in the last 30 days");
        assertEquals("SALES", s.basis());
        assertEquals(1.5, s.dailyDemand());
        assertEquals(42, s.targetStock());          // 1.5/day x 28 days
        assertEquals(36, s.suggestedQuantity());    // 42 - 6 available
    }

    @Autowired private InventoryRepository inventoryRepository;

    @Test
    void deletedProductsAreNotSuggestedForRestock() {
        long sfx = System.nanoTime();
        long shop = 7_300L + sfx % 100;
        List<Long> invIds = new ArrayList<>();
        for (String status : List.of("ACTIVE", "DELETED")) {
            Product p = new Product();
            p.setName("Áo " + status + " " + sfx);
            p.setSlug("ao-" + status.toLowerCase() + "-" + sfx);
            p.setPrice(new BigDecimal("100000"));
            p.setStatus(status);
            p = productRepository.saveAndFlush(p);
            Inventory inv = new Inventory();
            inv.setProductId(p.getId());
            inv.setProductName(p.getName());
            inv.setShopId(shop);
            inv.setQuantityOnHand(2);
            inv.setQuantityReserved(0);
            inv.setReorderLevel(10);
            invIds.add(inventoryRepository.saveAndFlush(inv).getId());
        }

        var suggested = inventoryRepository.findReplenishmentSuggestionsByShopId(shop).stream().map(Inventory::getId).toList();
        assertEquals(List.of(invIds.get(0)), suggested, "only the live product needs restocking");
        assertEquals(1, inventoryRepository.countLowStockByShopId(shop));
        assertTrue(inventoryRepository.findAllReplenishmentSuggestions().stream().noneMatch(i -> i.getId().equals(invIds.get(1))));
    }
}
