package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.CartDto;
import com.nguyenhoanglong.repository.UserRepository;
import com.nguyenhoanglong.service.BehaviorEventService;
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
    private final BehaviorEventService behaviorEventService;
    private final UserRepository userRepository;

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
            @RequestHeader(value = "X-Behavior-Session", required = false) String behaviorSession,
            @RequestHeader(value = "User-Agent", required = false) String userAgent,
            @Valid @RequestBody CartDto.AddToCartRequest request) {
        String email = getCurrentUserEmail();
        CartDto.CartResponse cart = cartService.addToCart(email, guestToken, request);
        // After addToCart's transaction committed: only a successful add is a signal.
        String userId = email != null ? userRepository.findByEmail(email).map(u -> u.getId()).orElse(null) : null;
        behaviorEventService.recordAddToCart(BehaviorEventService.resolveUserKey(userId, guestToken),
                request.getVariantId(), request.getQuantity(), behaviorSession, userAgent);
        return ResponseEntity.ok(cart);
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
