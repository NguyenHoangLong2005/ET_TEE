package com.nguyenhoanglong;

import com.nguyenhoanglong.dto.StoreProductFormDto;
import com.nguyenhoanglong.dto.UserStatusUpdateDto;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import com.nguyenhoanglong.service.MarketingService;
import com.nguyenhoanglong.service.StoreOwnerService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Regression tests for rules fixed in the business-logic review that had no test yet. */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class BusinessRulesIntegrationTest {

    @Autowired private StoreOwnerService storeOwnerService;
    @Autowired private MarketingService marketingService;
    @Autowired private UserRepository userRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private InventoryRepository inventoryRepository;

    private static long sfx() {
        return System.nanoTime();
    }

    private User user(Role role, Long shopId, String status) {
        User u = new User();
        u.setEmail(role.name().toLowerCase() + "-" + sfx() + "@test.local");
        u.setFullName("Test " + role.name());
        u.setPasswordHash("hash");
        u.setStatus(status);
        u.setRole(role);
        u.setShopId(shopId);
        return userRepository.save(u);
    }

    private static HttpStatus statusOf(Throwable t) {
        return HttpStatus.valueOf(((ResponseStatusException) t).getStatusCode().value());
    }

    @Test
    void ownerCannotReviveADeletedAccountOrLockAnotherOwner() {
        Long shop = 7_000L + sfx() % 1000;
        User owner = user(Role.SHOP_OWNER, shop, "ACTIVE");
        User peer = user(Role.SHOP_OWNER, shop, "ACTIVE");
        User deleted = user(Role.SALES_STAFF, shop, "BANNED");
        User staff = user(Role.SALES_STAFF, shop, "ACTIVE");

        assertThatThrownBy(() -> storeOwnerService.updateShopStaffStatus(shop, deleted.getId(),
                new UserStatusUpdateDto("ACTIVE", null), owner.getEmail()))
                .satisfies(t -> assertThat(statusOf(t)).isEqualTo(HttpStatus.FORBIDDEN));
        assertThatThrownBy(() -> storeOwnerService.updateShopStaffStatus(shop, peer.getId(),
                new UserStatusUpdateDto("LOCKED", "x"), owner.getEmail()))
                .satisfies(t -> assertThat(statusOf(t)).isEqualTo(HttpStatus.FORBIDDEN));
        assertThatThrownBy(() -> storeOwnerService.updateShopStaffStatus(shop, staff.getId(),
                new UserStatusUpdateDto("WHATEVER", null), owner.getEmail()))
                .satisfies(t -> assertThat(statusOf(t)).isEqualTo(HttpStatus.BAD_REQUEST));

        storeOwnerService.updateShopStaffStatus(shop, staff.getId(), new UserStatusUpdateDto("LOCKED", "nghỉ"), owner.getEmail());
        assertThat(userRepository.findById(staff.getId()).orElseThrow().getStatus()).isEqualTo("LOCKED");
    }

    @Test
    void revenueIsCountedOnTheDeliveryDate() {
        Long shop = 8_000L + sfx() % 1000;
        Order o = new Order();
        o.setOrderCode("DHTEST" + sfx());
        o.setCustomerName("Khách");
        o.setCustomerEmail("k@test.local");
        o.setCustomerPhone("0900000000");
        o.setShippingAddressSnapshot("HN");
        o.setShopId(shop);
        o.setTotalAmount(250_000.0);
        o.setStatus(OrderStatus.DELIVERED);
        o.setDeliveredAt(LocalDateTime.of(2020, 1, 15, 10, 0)); // placed today, delivered in Jan 2020
        orderRepository.saveAndFlush(o);

        Double jan2020 = orderRepository.sumRevenueForShopBetween(shop, Order.REVENUE_STATUSES,
                LocalDateTime.of(2020, 1, 1, 0, 0), LocalDateTime.of(2020, 2, 1, 0, 0));
        Double today = orderRepository.sumRevenueForShopBetween(shop, Order.REVENUE_STATUSES,
                LocalDateTime.now().toLocalDate().atStartOfDay(), LocalDateTime.now().plusDays(1));
        assertThat(jan2020).isEqualTo(250_000.0);
        assertThat(today).isZero();
    }

    @Test
    void aPausedProductCannotBePlacedOnTheHomePage() {
        Product p = new Product();
        p.setName("Áo tạm ngưng " + sfx());
        p.setSlug("ao-tam-ngung-" + sfx());
        p.setPrice(new BigDecimal("100000"));
        p.setStatus("INACTIVE");
        p = productRepository.save(p);

        ProductPlacement placement = new ProductPlacement();
        placement.setPlacementKey("HOME_TRENDING");
        placement.setProductId(p.getId());
        assertThatThrownBy(() -> marketingService.createPlacement(placement, "tester"))
                .satisfies(t -> assertThat(statusOf(t)).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void ownerAddsASizeToAnExistingProduct() {
        Category c = new Category();
        c.setName("Áo test " + sfx());
        c.setSlug("ao-test-" + sfx());
        c = categoryRepository.save(c);

        StoreProductFormDto f = new StoreProductFormDto();
        f.name = "Áo thun thêm size " + sfx();
        f.categoryId = c.getId();
        f.price = new BigDecimal("199000");
        f.status = "ACTIVE";
        StoreProductFormDto.VariantForm m = new StoreProductFormDto.VariantForm();
        m.sku = "SZ-M-" + sfx();
        m.size = "M";
        m.stock = 3;
        f.variants = new java.util.ArrayList<>(List.of(m));
        StoreProductFormDto created = storeOwnerService.createProduct(f);

        StoreProductFormDto edit = storeOwnerService.getProductForm(created.id);
        StoreProductFormDto.VariantForm l = new StoreProductFormDto.VariantForm();
        l.sku = "SZ-L-" + sfx();
        l.size = "L";
        l.stock = 4;
        edit.variants.add(l);
        StoreProductFormDto saved = storeOwnerService.updateProduct(created.id, edit);

        assertThat(saved.variants).hasSize(2);
        assertThat(saved.variants.stream().filter(v -> "L".equals(v.size)).findFirst().orElseThrow().stock).isEqualTo(4);
        assertThat(inventoryRepository.findByProductId(created.id).orElseThrow().getQuantityOnHand()).isEqualTo(7);
    }
}
