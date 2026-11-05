package com.nguyenhoanglong;

import com.nguyenhoanglong.config.DemoDataSeeder;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Bo du lieu demo chay het luong nghiep vu that: moi don dung o dung buoc, kien hang khop trang
 * thai don, anh bang chung la tep that tren dia, va chay lan hai khong tao trung.
 */
@SpringBootTest(properties = "app.upload-dir=target/test-uploads")
@ActiveProfiles("test")
class DemoDataSeederIntegrationTest {

    @Autowired private DemoDataSeeder seeder;
    @Autowired private CategoryRepository categories;
    @Autowired private ProductRepository products;
    @Autowired private ProductVariantRepository variants;
    @Autowired private InventoryRepository inventories;
    @Autowired private UserRepository users;
    @Autowired private JdbcTemplate jdbc;

    private void staff(Role role) {
        User u = new User();
        u.setEmail("demo_" + role.name().toLowerCase() + "_" + System.nanoTime() + "@ettee.vn");
        u.setFullName("Demo " + role.name());
        u.setPasswordHash("x");
        u.setStatus("ACTIVE");
        u.setRole(role);
        u.setShopId(1L);
        users.save(u);
    }

    private void productWithStock(int n) {
        Category c = categories.findAll().stream().findFirst().orElseGet(() -> {
            Category x = new Category();
            x.setName("Demo");
            x.setSlug("demo-" + System.nanoTime());
            return categories.save(x);
        });
        Product p = new Product();
        p.setName("Áo demo " + n);
        p.setSlug("ao-demo-" + n + "-" + System.nanoTime());
        p.setPrice(BigDecimal.valueOf(250000));
        p.setCategory(c);
        p.setStatus("ACTIVE");
        p.setSoldCount(0);
        p = products.save(p);
        for (String size : List.of("M", "L")) {
            ProductVariant v = new ProductVariant();
            v.setProduct(p);
            v.setSku("SKU-DEMO-" + n + size + System.nanoTime());
            v.setColor("Đen");
            v.setSize(size);
            v.setStock(200);
            v.setAvailableQuantity(200);
            v.setPrice(BigDecimal.valueOf(250000));
            variants.save(v);
        }
        Inventory inv = new Inventory();
        inv.setProductId(p.getId());
        inv.setProductName(p.getName());
        inv.setQuantityOnHand(500);
        inv.setQuantityReserved(0);
        inv.setShopId(1L);
        inv.setReorderLevel(5);
        inventories.save(inv);
    }

    @Test
    void seedsEveryStageConsistentlyAndOnlyOnce() {
        staff(Role.SALES_STAFF);
        staff(Role.WAREHOUSE_STAFF);
        staff(Role.SHIPPING_STAFF);
        for (int i = 0; i < 6; i++) productWithStock(i);

        Map<String, Integer> result = seeder.seed();
        assertTrue(result.keySet().stream().noneMatch(k -> k.startsWith("FAILED")), "no stage may fail: " + result);

        assertEquals(6, count("SELECT COUNT(*) FROM orders WHERE order_code LIKE 'DHDM%' AND status = 'PENDING_CONFIRMATION'"));
        // 3 don huy truoc khi giao + 1 don giao that bai hoan ve kho (ShippingService chuyen sang CANCELLED).
        assertEquals(4, count("SELECT COUNT(*) FROM orders WHERE order_code LIKE 'DHDM%' AND status = 'CANCELLED'"));
        assertEquals(1, count("SELECT COUNT(*) FROM shipments s JOIN orders o ON o.id = s.order_id WHERE o.order_code LIKE 'DHDM%' AND s.status = 'RETURNED'"));
        assertEquals(2, count("SELECT COUNT(*) FROM orders WHERE order_code LIKE 'DHDM%' AND status = 'RETURN_REQUESTED'"));
        // Kien da giao <=> don da giao (hoac da giao roi khach yeu cau tra): khong con lech nhu du lieu cu.
        assertEquals(0, count("""
                SELECT COUNT(*) FROM shipments s JOIN orders o ON o.id = s.order_id
                WHERE o.order_code LIKE 'DHDM%' AND s.status = 'DELIVERED'
                  AND o.status NOT IN ('DELIVERED', 'RETURN_REQUESTED')"""));
        assertEquals(12, count("SELECT COUNT(*) FROM shipments s JOIN orders o ON o.id = s.order_id WHERE o.order_code LIKE 'DHDM%' AND s.status = 'DELIVERED'"));

        // Moi kien da giao co anh bang chung, va anh la tep that.
        List<String> proofs = jdbc.queryForList("""
                SELECT s.delivery_proof_url FROM shipments s JOIN orders o ON o.id = s.order_id
                WHERE o.order_code LIKE 'DHDM%' AND s.status = 'DELIVERED'""", String.class);
        assertTrue(proofs.stream().allMatch(u -> u != null && u.startsWith("/api/uploads/proofs/")), proofs.toString());
        for (String url : proofs) {
            Path file = Path.of("target/test-uploads").resolve(url.substring("/api/uploads/".length()));
            assertTrue(Files.isRegularFile(file), "missing " + file);
        }

        // Don demo nam trong qua khu, khong phai tat ca "vua xong".
        assertTrue(count("SELECT COUNT(*) FROM orders WHERE order_code LIKE 'DHDM%' AND created_at < DATEADD('DAY', -3, CURRENT_TIMESTAMP)") > 0);

        // Chay lai khong tao trung.
        int before = count("SELECT COUNT(*) FROM orders WHERE order_code LIKE 'DHDM%'");
        assertTrue(seeder.seed().containsKey("skipped"));
        assertEquals(before, count("SELECT COUNT(*) FROM orders WHERE order_code LIKE 'DHDM%'"));
    }

    private int count(String sql) {
        Integer n = jdbc.queryForObject(sql, Integer.class);
        return n == null ? 0 : n;
    }
}
