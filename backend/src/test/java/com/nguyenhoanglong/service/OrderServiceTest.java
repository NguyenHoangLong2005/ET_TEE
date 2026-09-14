package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.CheckoutRequest;
import com.nguyenhoanglong.dto.OrderResponse;
import com.nguyenhoanglong.entity.Cart;
import com.nguyenhoanglong.entity.CartItem;
import com.nguyenhoanglong.entity.Order;
import com.nguyenhoanglong.entity.OrderItem;
import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.entity.ProductVariant;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.CartRepository;
import com.nguyenhoanglong.repository.OrderItemRepository;
import com.nguyenhoanglong.repository.OrderRepository;
import com.nguyenhoanglong.repository.OrderStatusHistoryRepository;
import com.nguyenhoanglong.repository.ProductVariantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private OrderStatusHistoryRepository historyRepository;
    @Mock private CartRepository cartRepository;
    @Mock private ProductVariantRepository variantRepository;
    @Mock private MailService mailService;
    @Mock private OrderItemRepository orderItemRepository;

    @InjectMocks private OrderService orderService;

    private User user;
    private ProductVariant variant;

    private static void setField(Object o, String name, Object value) throws Exception {
        Field f = o.getClass().getDeclaredField(name);
        f.setAccessible(true);
        f.set(o, value);
    }

    @BeforeEach
    void setUp() throws Exception {
        user = new User();
        setField(user, "id", "user-1");
        user.setEmail("user@example.com");
        user.setFullName("Test User");
        user.setPhone("0900000000");

        Product product = new Product();
        setField(product, "id", 100L);
        product.setName("Áo test");
        product.setSlug("ao-test");

        variant = new ProductVariant();
        setField(variant, "id", 11L);
        variant.setProduct(product);
        variant.setSku("TS-001-A");
        variant.setColor("Đen");
        variant.setSize("M");
        variant.setPrice(new BigDecimal("200000"));
        variant.setSalePrice(null);
        variant.setAvailableQuantity(10);
        variant.setStock(15);
    }

    private CartItem cartItem(long id, ProductVariant v, int qty) {
        CartItem ci = new CartItem();
        try { setField(ci, "id", id); } catch (Exception ignored) {}
        ci.setProductVariant(v);
        ci.setQuantity(qty);
        return ci;
    }

    private Cart makeCart(long id, User u, String guestToken, java.util.List<CartItem> items) {
        Cart cart = new Cart();
        try { setField(cart, "id", id); } catch (Exception ignored) {}
        cart.setUser(u);
        cart.setGuestToken(guestToken);
        for (CartItem ci : items) {
            cart.getItems().add(ci);
            ci.setCart(cart);
        }
        return cart;
    }

    private CheckoutRequest checkoutRequest() {
        CheckoutRequest req = new CheckoutRequest();
        req.setShippingAddress("123 Test");
        req.setPaymentMethod("COD");
        req.setCustomerName("Test User");
        req.setCustomerPhone("0900000000");
        req.setCustomerEmail("user@example.com");
        return req;
    }

    @Test
    void checkout_userCart_picksPriceFromVariantNotCart() {
        Cart cart = makeCart(1L, user, null, new ArrayList<>(java.util.List.of(cartItem(50L, variant, 2))));
        when(cartRepository.findByUserId("user-1")).thenReturn(Optional.of(cart));
        when(variantRepository.findByIdWithPessimisticLock(11L)).thenReturn(Optional.of(variant));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            try { setField(o, "id", 999L); } catch (Exception ignored) {}
            return o;
        });

        OrderResponse res = orderService.checkout(user, null, checkoutRequest());

        ArgumentCaptor<Order> saved = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(saved.capture());
        Order savedOrder = saved.getValue();

        // Pricing must come from variant.price, not anything the client injected.
        assertThat(savedOrder.getItems()).hasSize(1);
        OrderItem item = savedOrder.getItems().get(0);
        assertThat(item.getUnitPrice()).isEqualTo(200000.0);
        assertThat(item.getQuantity()).isEqualTo(2);
        assertThat(item.getTotalPrice()).isEqualTo(400000.0);
        assertThat(savedOrder.getSubtotal()).isEqualTo(400000.0);
        assertThat(savedOrder.getTotalAmount()).isEqualTo(400000.0);
        assertThat(savedOrder.getOrderStatus()).isEqualTo("PENDING_CONFIRMATION");
        assertThat(savedOrder.getPaymentMethod()).isEqualTo("COD");
        assertThat(savedOrder.getOrderCode()).startsWith("DH");
        assertThat(savedOrder.getOrderCode()).hasSize(12); // "DH" + 10 upper hex chars

        // Stock decremented by ordered quantity
        assertThat(variant.getAvailableQuantity()).isEqualTo(8);
        assertThat(variant.getStock()).isEqualTo(13);
    }

    @Test
    void checkout_orderCodeIsUnique_acrossInvocations() {
        // Two sequential checkouts must produce two different codes.
        for (int i = 0; i < 3; i++) {
            Cart cart = makeCart(i + 1L, user, null, new ArrayList<>(java.util.List.of(cartItem(50L + i, variant, 1))));
            when(cartRepository.findByUserId("user-1")).thenReturn(Optional.of(cart));
            when(variantRepository.findByIdWithPessimisticLock(11L)).thenReturn(Optional.of(variant));
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

            orderService.checkout(user, null, checkoutRequest());
        }
        ArgumentCaptor<Order> saved = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository, times(3)).save(saved.capture());
        long distinct = saved.getAllValues().stream()
                .map(Order::getOrderCode)
                .distinct()
                .count();
        assertThat(distinct).isEqualTo(3);
    }

    @Test
    void checkout_notEnoughStock_throwsAndDoesNotSave() {
        Cart cart = makeCart(1L, user, null, new ArrayList<>(java.util.List.of(cartItem(50L, variant, 11))));
        when(cartRepository.findByUserId("user-1")).thenReturn(Optional.of(cart));
        // availableQuantity is 10; requesting 11 must fail.
        when(variantRepository.findByIdWithPessimisticLock(11L)).thenReturn(Optional.of(variant));

        assertThatThrownBy(() -> orderService.checkout(user, null, checkoutRequest()))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("không đủ");

        verify(orderRepository, never()).save(any(Order.class));
        verify(historyRepository, never()).save(any());
    }

    @Test
    void checkout_usesSalePriceWhenPresent() {
        variant.setSalePrice(new BigDecimal("150000"));
        Cart cart = makeCart(1L, user, null, new ArrayList<>(java.util.List.of(cartItem(50L, variant, 2))));
        when(cartRepository.findByUserId("user-1")).thenReturn(Optional.of(cart));
        when(variantRepository.findByIdWithPessimisticLock(11L)).thenReturn(Optional.of(variant));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        orderService.checkout(user, null, checkoutRequest());

        ArgumentCaptor<Order> captor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(captor.capture());
        OrderItem item = captor.getValue().getItems().get(0);
        assertThat(item.getUnitPrice()).isEqualTo(150000.0);
        assertThat(item.getTotalPrice()).isEqualTo(300000.0);
    }

    @Test
    void checkout_emptyCart_throws() {
        Cart cart = makeCart(1L, user, null, new ArrayList<>());
        when(cartRepository.findByUserId("user-1")).thenReturn(Optional.of(cart));
        assertThatThrownBy(() -> orderService.checkout(user, null, checkoutRequest()))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("trống");
    }

    @Test
    void checkout_invalidPaymentMethod_throws() {
        Cart cart = makeCart(1L, user, null, new ArrayList<>(java.util.List.of(cartItem(50L, variant, 1))));
        when(cartRepository.findByUserId("user-1")).thenReturn(Optional.of(cart));
        CheckoutRequest req = checkoutRequest();
        req.setPaymentMethod("BITCOIN");

        assertThatThrownBy(() -> orderService.checkout(user, null, req))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("không hợp lệ");
    }

    @Test
    void checkout_bankTransfer_setsPendingPaymentStatus() {
        Cart cart = makeCart(1L, user, null, new ArrayList<>(java.util.List.of(cartItem(50L, variant, 1))));
        when(cartRepository.findByUserId("user-1")).thenReturn(Optional.of(cart));
        when(variantRepository.findByIdWithPessimisticLock(11L)).thenReturn(Optional.of(variant));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        CheckoutRequest req = checkoutRequest();
        req.setPaymentMethod("BANK_TRANSFER");

        orderService.checkout(user, null, req);

        ArgumentCaptor<Order> captor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(captor.capture());
        Order saved = captor.getValue();
        assertThat(saved.getPaymentMethod()).isEqualTo("BANK_TRANSFER");
        assertThat(saved.getOrderStatus()).isEqualTo("PENDING_PAYMENT");
        assertThat(saved.getPaymentStatus()).isEqualTo("WAITING_TRANSFER");
    }

    @Test
    void getOrderDetails_userOrder_accessibleOnlyToItsOwner() {
        Order order = new Order();
        try { setField(order, "id", 1L); } catch (Exception ignored) {}
        order.setOrderCode("DH1234567890");
        order.setUser(user);

        when(orderRepository.findByOrderCode("DH1234567890")).thenReturn(Optional.of(order));

        User other = new User();
        try { setField(other, "id", "user-2"); } catch (Exception ignored) {}

        OrderResponse res = orderService.getOrderDetails("DH1234567890", user, null);
        assertThat(res.getOrderCode()).isEqualTo("DH1234567890");

        assertThatThrownBy(() -> orderService.getOrderDetails("DH1234567890", other, null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("không có quyền");
    }

    @Test
    void getOrderDetails_guestOrder_wrongTokenThrows() {
        Order order = new Order();
        try { setField(order, "id", 1L); } catch (Exception ignored) {}
        order.setOrderCode("DH1234567890");
        order.setGuestToken("correct-token");

        when(orderRepository.findByOrderCode("DH1234567890")).thenReturn(Optional.of(order));

        // OK with the correct token
        OrderResponse ok = orderService.getOrderDetails("DH1234567890", null, "correct-token");
        assertThat(ok).isNotNull();

        // Wrong token → 403
        assertThatThrownBy(() -> orderService.getOrderDetails("DH1234567890", null, "wrong-token"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("không có quyền");

        // No token → 403
        assertThatThrownBy(() -> orderService.getOrderDetails("DH1234567890", null, null))
                .isInstanceOf(ResponseStatusException.class);
    }
}
