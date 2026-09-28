package com.nguyenhoanglong;

import com.nguyenhoanglong.dto.CheckoutRequest;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import com.nguyenhoanglong.service.OrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
public class SalesOrderConcurrencyIntegrationTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductVariantRepository variantRepository;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private ProductVariant testVariant;
    private static final int INITIAL_STOCK = 5;

    @BeforeEach
    void setUp() {
        cartRepository.deleteAll();

        Category category = categoryRepository.findAll().stream().findFirst().orElseGet(() -> {
            Category c = new Category();
            c.setName("Test Category");
            c.setSlug("test-category-" + System.currentTimeMillis());
            return categoryRepository.save(c);
        });

        Product product = new Product();
        product.setName("Áo Thun POS Concurrency");
        product.setSlug("ao-thun-pos-" + System.currentTimeMillis());
        product.setPrice(BigDecimal.valueOf(200000));
        product.setCategory(category);
        product.setStatus("ACTIVE");
        product.setSoldCount(0);
        Product savedProduct = productRepository.save(product);

        ProductVariant variant = new ProductVariant();
        variant.setProduct(savedProduct);
        variant.setSku("SKU-POS-" + System.currentTimeMillis());
        variant.setColor("Đen");
        variant.setSize("L");
        variant.setStock(INITIAL_STOCK);
        variant.setAvailableQuantity(INITIAL_STOCK);
        variant.setPrice(BigDecimal.valueOf(200000));
        testVariant = variantRepository.save(variant);
    }

    @Test
    @DisplayName("P3-2: Concurrent checkout on limited stock must prevent overselling and guarantee inventory integrity")
    void testConcurrentOrderCheckoutStockDeduction() throws InterruptedException {
        int attemptCount = 8; // 8 concurrent customers attempting to buy 1 item when initial stock is 5
        ExecutorService executor = Executors.newFixedThreadPool(attemptCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch endLatch = new CountDownLatch(attemptCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        List<String> guestTokens = new ArrayList<>();
        for (int i = 0; i < attemptCount; i++) {
            String guestToken = "GUEST-" + UUID.randomUUID();
            guestTokens.add(guestToken);

            // Pre-seed cart for each guest
            Cart cart = new Cart();
            cart.setGuestToken(guestToken);

            CartItem item = new CartItem();
            item.setCart(cart);
            item.setProductVariant(testVariant);
            item.setQuantity(1);

            List<CartItem> items = new ArrayList<>();
            items.add(item);
            cart.setItems(items);
            cartRepository.save(cart);
        }

        for (int i = 0; i < attemptCount; i++) {
            final String guestToken = guestTokens.get(i);
            executor.submit(() -> {
                try {
                    startLatch.await();
                    CheckoutRequest req = new CheckoutRequest();
                    req.setCustomerName("Khách POS " + guestToken);
                    req.setCustomerPhone("0900000000");
                    req.setCustomerEmail("pos@example.com");
                    req.setShippingAddress("Store 1 POS Counter");
                    req.setPaymentMethod("COD");

                    orderService.checkout(null, guestToken, req);
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    failCount.incrementAndGet();
                } finally {
                    endLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean completed = endLatch.await(45, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(completed, "All checkout requests finished within timeout");
        assertEquals(INITIAL_STOCK, successCount.get(), "Exactly " + INITIAL_STOCK + " orders should succeed since initial stock is " + INITIAL_STOCK);
        assertEquals(attemptCount - INITIAL_STOCK, failCount.get(), "Remaining " + (attemptCount - INITIAL_STOCK) + " orders should fail due to stock depletion");

        ProductVariant finalVariant = variantRepository.findById(testVariant.getId()).orElseThrow();
        assertEquals(0, finalVariant.getAvailableQuantity(), "Available quantity must be reduced to 0");
        assertEquals(0, finalVariant.getStock(), "Stock must be reduced to 0");
    }
}
