package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.entity.ProductVariant;
import com.nguyenhoanglong.repository.ProductRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SalePriceDatafixServiceTest {

    @Mock private ProductRepository productRepository;
    @Mock private EntityManager entityManager;

    private SalePriceDatafixService service;

    private static void setField(Object o, String name, Object value) throws Exception {
        Field f = o.getClass().getDeclaredField(name);
        f.setAccessible(true);
        f.set(o, value);
    }

    private Product product(long id, BigDecimal price, BigDecimal existingSalePrice, String status, int variantCount) throws Exception {
        Product p = new Product();
        setField(p, "id", id);
        p.setName("Product " + id);
        p.setSlug("product-" + id);
        p.setPrice(price);
        p.setSalePrice(existingSalePrice);
        p.setStatus(status);
        p.setIsSale(false);
        for (int i = 0; i < variantCount; i++) {
            ProductVariant v = new ProductVariant();
            setField(v, "id", (long) (id * 1000 + i));
            v.setProduct(p);
            v.setSku("SKU-" + id + "-" + i);
            v.setPrice(price);
            v.setSalePrice(null);
            v.setAvailableQuantity(10);
            p.getVariants().add(v);
        }
        return p;
    }

    @BeforeEach
    void setUp() {
        service = new SalePriceDatafixService(productRepository, 0.5, "sale-price-fix-report.md");
        // Inject the mocked EntityManager via reflection so the test can drive
        // flush()/clear() without a real JPA persistence context.
        try {
            java.lang.reflect.Field f = SalePriceDatafixService.class.getDeclaredField("entityManager");
            f.setAccessible(true);
            f.set(service, entityManager);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void skips_products_with_valid_existing_salePrice() throws Exception {
        // Product already has salePrice < price → must be skipped entirely.
        Product ok = product(1L, new BigDecimal("100000"), new BigDecimal("70000"), "ACTIVE", 1);
        Product noSale = product(2L, new BigDecimal("100000"), null, "ACTIVE", 1);

        when(productRepository.findAll()).thenReturn(List.of(ok, noSale));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        SalePriceDatafixService.DatafixReport report = service.run();

        assertThat(report.totalUpdated()).isEqualTo(1);
        ArgumentCaptor<Product> captor = ArgumentCaptor.forClass(Product.class);
        verify(productRepository, times(1)).save(captor.capture());
        assertThat(captor.getValue().getId()).isEqualTo(2L);
    }

    @Test
    void sets_salePrice_within_10_to_30_percent_discount() throws Exception {
        Product p = product(1L, new BigDecimal("100000"), null, "ACTIVE", 0);
        when(productRepository.findAll()).thenReturn(List.of(p));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        SalePriceDatafixService.DatafixReport report = service.run();

        assertThat(report.totalUpdated()).isEqualTo(1);
        BigDecimal newSale = p.getSalePrice();
        assertThat(newSale).isNotNull();
        assertThat(newSale).isLessThan(p.getPrice());

        BigDecimal discount = p.getPrice().subtract(newSale)
                .divide(p.getPrice(), 4, java.math.RoundingMode.HALF_UP);
        // Discount ∈ [0.10, 0.30]
        assertThat(discount.doubleValue()).isBetween(0.099, 0.301);
    }

    @Test
    void sets_isSale_flag() throws Exception {
        Product p = product(1L, new BigDecimal("200000"), null, "ACTIVE", 0);
        when(productRepository.findAll()).thenReturn(List.of(p));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        service.run();

        assertThat(p.getIsSale()).isTrue();
        assertThat(p.getSalePrice()).isNotNull();
        assertThat(p.getSalePrice()).isLessThan(p.getPrice());
    }

    @Test
    void does_not_touch_inactive_products() throws Exception {
        Product active = product(1L, new BigDecimal("100000"), null, "ACTIVE", 0);
        Product hidden = product(2L, new BigDecimal("100000"), null, "HIDDEN", 0);
        when(productRepository.findAll()).thenReturn(List.of(active, hidden));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        SalePriceDatafixService.DatafixReport report = service.run();

        assertThat(report.totalUpdated()).isEqualTo(1);
        assertThat(active.getIsSale()).isTrue();
        assertThat(hidden.getIsSale()).isFalse();
        assertThat(hidden.getSalePrice()).isNull();
    }

    @Test
    void only_updates_target_share_of_eligible_products() throws Exception {
        // Construct a NEW service with a smaller targetShare (0.2 = 20%).
        SalePriceDatafixService s = new SalePriceDatafixService(productRepository, 0.2, "report.md");
        java.lang.reflect.Field f = SalePriceDatafixService.class.getDeclaredField("entityManager");
        f.setAccessible(true);
        f.set(s, entityManager);
        List<Product> products = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            products.add(product(i, new BigDecimal("100000"), null, "ACTIVE", 0));
        }
        when(productRepository.findAll()).thenReturn(products);
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        SalePriceDatafixService.DatafixReport report = s.run();

        // 10 eligible * 0.2 = 2 (rounded)
        assertThat(report.totalUpdated()).isEqualTo(2);
    }

    @Test
    void invalid_target_share_throws() {
        assertThatThrownBy(() -> new SalePriceDatafixService(productRepository, -0.1, "report.md"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SalePriceDatafixService(productRepository, 1.5, "report.md"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
