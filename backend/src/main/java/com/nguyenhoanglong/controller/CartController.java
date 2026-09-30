package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.CartDto;
import com.nguyenhoanglong.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    private String getCurrentUserEmail() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
            return auth.getName();
        }
        return null;
    }

    @GetMapping
    public ResponseEntity<CartDto.CartResponse> getCart(
            @RequestHeader(value = "X-Guest-Cart-Token", required = false) String guestToken) {
        String email = getCurrentUserEmail();
        return ResponseEntity.ok(cartService.getCart(email, guestToken));
    }

    @PostMapping("/items")
    public ResponseEntity<CartDto.CartResponse> addToCart(
            @RequestHeader(value = "X-Guest-Cart-Token", required = false) String guestToken,
            @Valid @RequestBody CartDto.AddToCartRequest request) {
        String email = getCurrentUserEmail();
        return ResponseEntity.ok(cartService.addToCart(email, guestToken, request));
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<CartDto.CartResponse> updateCartItem(
            @RequestHeader(value = "X-Guest-Cart-Token", required = false) String guestToken,
            @PathVariable Long itemId,
            @Valid @RequestBody CartDto.UpdateCartItemRequest request) {
        String email = getCurrentUserEmail();
        return ResponseEntity.ok(cartService.updateCartItem(email, guestToken, itemId, request));
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<CartDto.CartResponse> removeFromCart(
            @RequestHeader(value = "X-Guest-Cart-Token", required = false) String guestToken,
            @PathVariable Long itemId) {
        String email = getCurrentUserEmail();
        return ResponseEntity.ok(cartService.removeFromCart(email, guestToken, itemId));
    }

    @PostMapping("/merge")
    public ResponseEntity<Void> mergeCart(
            @RequestHeader(value = "X-Guest-Cart-Token", required = false) String guestToken) {
        String email = getCurrentUserEmail();
        if (email == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        if (guestToken != null && !guestToken.trim().isEmpty()) {
            cartService.mergeGuestCartIntoUserCart(email, guestToken);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.badRequest().build();
    }
}
