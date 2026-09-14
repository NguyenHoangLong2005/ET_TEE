package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.CartDto;
import com.nguyenhoanglong.entity.Cart;
import com.nguyenhoanglong.entity.CartItem;
import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.entity.ProductVariant;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.exception.ApiException;
import com.nguyenhoanglong.repository.CartItemRepository;
import com.nguyenhoanglong.repository.CartRepository;
import com.nguyenhoanglong.repository.ProductVariantRepository;
import com.nguyenhoanglong.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
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
class CartServiceTest {

    @Mock private CartRepository cartRepository;
    @Mock private CartItemRepository cartItemRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProductVariantRepository productVariantRepository;

    @InjectMocks private CartService cartService;

    private User user;
    private ProductVariant variantA; // availableQuantity = 10
    private ProductVariant variantB; // availableQuantity = 2 (low stock)

    @BeforeEach
    void setUp() throws Exception {
        user = new User();
        setField(user, "id", "user-1");
        user.setEmail("user@example.com");

        Product p = new Product();
        setField(p, "id", 100L);
        p.setName("Áo phông test");
        p.setSlug("ao-phong-test");

        variantA = new ProductVariant();
        setField(variantA, "id", 11L);
        variantA.setProduct(p);
        variantA.setSku("TS-001-A");
        variantA.setColor("Đen");
        variantA.setSize("M");
        variantA.setAvailableQuantity(10);
        variantA.setStock(15);

        variantB = new ProductVariant();
        setField(variantB, "id", 22L);
        variantB.setProduct(p);
        variantB.setSku("TS-001-B");
        variantB.setColor("Trắng");
        variantB.setSize("L");
        variantB.setAvailableQuantity(2);
        variantB.setStock(2);
    }

    private static void setField(Object o, String name, Object value) throws Exception {
        Field f = o.getClass().getDeclaredField(name);
        f.setAccessible(true);
        f.set(o, value);
    }

    private CartItem newItem(Long id, ProductVariant v, int qty) {
        CartItem ci = new CartItem();
        try { setField(ci, "id", id); } catch (Exception e) { /* ignore */ }
        ci.setProductVariant(v);
        ci.setQuantity(qty);
        return ci;
    }

    private Cart makeCart(Long id, String guestToken, User u, java.util.List<CartItem> items) {
        Cart cart = new Cart();
        try { setField(cart, "id", id); } catch (Exception e) { /* ignore */ }
        cart.setGuestToken(guestToken);
        cart.setUser(u);
        if (items != null) {
            java.util.List<CartItem> target = cart.getItems();
            items.forEach(it -> {
                target.add(it);
                it.setCart(cart);
            });
        }
        return cart;
    }

    @Test
    void merge_emptyGuestToken_isNoop() {
        CartMergeResult result = cartService.mergeGuestCartIntoUserCart("user@example.com", null);
        assertThat(result.getMergedItems()).isZero();
        assertThat(result.getGuestItemsProcessed()).isZero();
        assertThat(result.getWarnings()).isEmpty();
        verify(cartRepository, never()).findByGuestToken(any());
    }

    @Test
    void merge_blankGuestToken_isNoop() {
        CartMergeResult result = cartService.mergeGuestCartIntoUserCart("user@example.com", "   ");
        assertThat(result.getMergedItems()).isZero();
        verify(cartRepository, never()).findByGuestToken(any());
    }

    @Test
    void merge_noGuestCart_isNoop() {
        when(cartRepository.findByGuestToken("ghost")).thenReturn(Optional.empty());
        CartMergeResult result = cartService.mergeGuestCartIntoUserCart("user@example.com", "ghost");
        assertThat(result.getMergedItems()).isZero();
    }

    @Test
    void merge_duplicateVariant_sumsQuantityAndCapsAtAvailable() {
        // User cart already has variantA x 6; guest cart has variantA x 7.
        // Available = 10. Combined = 13 → cap to 10, expect warning.
        Cart userCart = makeCart(99L, null, user, new ArrayList<>(java.util.List.of(newItem(1L, variantA, 6))));
        Cart guestCart = makeCart(7L, "guest-token", null, new ArrayList<>(java.util.List.of(newItem(2L, variantA, 7))));

        when(cartRepository.findByGuestToken("guest-token")).thenReturn(Optional.of(guestCart));
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId("user-1")).thenReturn(Optional.of(userCart));

        CartMergeResult result = cartService.mergeGuestCartIntoUserCart("user@example.com", "guest-token");

        assertThat(result.getMergedItems()).isEqualTo(1);
        assertThat(result.getWarnings()).hasSize(1);
        assertThat(result.getWarnings().get(0)).contains("Áo phông test");
        assertThat(userCart.getItems()).hasSize(1);
        assertThat(userCart.getItems().get(0).getQuantity()).isEqualTo(10); // capped

        verify(cartRepository).save(userCart);
        verify(cartItemRepository).deleteAll(guestCart.getItems());
        verify(cartRepository).delete(guestCart);
    }

    @Test
    void merge_duplicateVariant_doesNotExceedAvailable_noWarning() {
        // User cart already has variantA x 2; guest cart has variantA x 3.
        // Available = 10. Combined = 5 → sum cleanly, no warning.
        Cart userCart = makeCart(99L, null, user, new ArrayList<>(java.util.List.of(newItem(1L, variantA, 2))));
        Cart guestCart = makeCart(7L, "guest-token", null, new ArrayList<>(java.util.List.of(newItem(2L, variantA, 3))));

        when(cartRepository.findByGuestToken("guest-token")).thenReturn(Optional.of(guestCart));
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId("user-1")).thenReturn(Optional.of(userCart));

        CartMergeResult result = cartService.mergeGuestCartIntoUserCart("user@example.com", "guest-token");

        assertThat(result.getWarnings()).isEmpty();
        assertThat(userCart.getItems().get(0).getQuantity()).isEqualTo(5);
    }

    @Test
    void merge_differentVariant_addsNewLine() {
        Cart userCart = makeCart(99L, null, user, new ArrayList<>()); // empty
        Cart guestCart = makeCart(7L, "guest-token", null, new ArrayList<>(java.util.List.of(newItem(2L, variantB, 1))));

        when(cartRepository.findByGuestToken("guest-token")).thenReturn(Optional.of(guestCart));
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId("user-1")).thenReturn(Optional.of(userCart));

        CartMergeResult result = cartService.mergeGuestCartIntoUserCart("user@example.com", "guest-token");

        assertThat(result.getWarnings()).isEmpty();
        assertThat(userCart.getItems()).hasSize(1);
        assertThat(userCart.getItems().get(0).getQuantity()).isEqualTo(1);
        assertThat(userCart.getItems().get(0).getProductVariant().getSku()).isEqualTo("TS-001-B");
    }

    @Test
    void merge_newLine_overStock_capsAndWarns() {
        // variantB availableQuantity=2; guest requests 5 → cap to 2, warn.
        Cart userCart = makeCart(99L, null, user, new ArrayList<>());
        Cart guestCart = makeCart(7L, "guest-token", null, new ArrayList<>(java.util.List.of(newItem(2L, variantB, 5))));

        when(cartRepository.findByGuestToken("guest-token")).thenReturn(Optional.of(guestCart));
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId("user-1")).thenReturn(Optional.of(userCart));

        CartMergeResult result = cartService.mergeGuestCartIntoUserCart("user@example.com", "guest-token");

        assertThat(result.getWarnings()).hasSize(1);
        assertThat(userCart.getItems()).hasSize(1);
        assertThat(userCart.getItems().get(0).getQuantity()).isEqualTo(2);
    }

    @Test
    void merge_itemWithZeroAvailable_doesNotAddLineButStillWarns() {
        // variantB availableQuantity=0; guest requests 1 → no line added, warn.
        variantB.setAvailableQuantity(0);
        Cart userCart = makeCart(99L, null, user, new ArrayList<>());
        Cart guestCart = makeCart(7L, "guest-token", null, new ArrayList<>(java.util.List.of(newItem(2L, variantB, 1))));

        when(cartRepository.findByGuestToken("guest-token")).thenReturn(Optional.of(guestCart));
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId("user-1")).thenReturn(Optional.of(userCart));

        CartMergeResult result = cartService.mergeGuestCartIntoUserCart("user@example.com", "guest-token");

        assertThat(result.getWarnings()).hasSize(1);
        assertThat(userCart.getItems()).isEmpty();
    }

    @Test
    void merge_userHasNoCart_createsOne() {
        Cart guestCart = makeCart(7L, "guest-token", null, new ArrayList<>(java.util.List.of(newItem(2L, variantA, 3))));
        when(cartRepository.findByGuestToken("guest-token")).thenReturn(Optional.of(guestCart));
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(cartRepository.findByUserId("user-1")).thenReturn(Optional.empty());

        ArgumentCaptor<Cart> saved = ArgumentCaptor.forClass(Cart.class);
        when(cartRepository.save(any(Cart.class))).thenAnswer(inv -> {
            Cart c = inv.getArgument(0);
            try { setField(c, "id", 123L); } catch (Exception e) { /* ignore */ }
            return c;
        });

        CartMergeResult result = cartService.mergeGuestCartIntoUserCart("user@example.com", "guest-token");

        assertThat(result.getMergedItems()).isEqualTo(1);
        verify(cartRepository, times(2)).save(any(Cart.class)); // 1 save for new user cart, another for the redundant save(userCart) at the end
    }

    @Test
    void addToCart_stockExceeded_throwsConflict() {
        Cart existing = makeCart(5L, "guest-token", null, new ArrayList<>());
        when(cartRepository.findByGuestToken("guest-token")).thenReturn(Optional.of(existing));
        when(productVariantRepository.findById(22L)).thenReturn(Optional.of(variantB));

        CartDto.AddToCartRequest req = new CartDto.AddToCartRequest();
        req.setVariantId(22L);
        req.setQuantity(5); // variantB only has 2

        assertThatThrownBy(() -> cartService.addToCart(null, "guest-token", req))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("vượt quá");
    }
}
