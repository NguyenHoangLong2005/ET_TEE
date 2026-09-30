package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.ApiResponse;
import com.nguyenhoanglong.dto.ProductDto;
import com.nguyenhoanglong.service.WishlistService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wishlist")
public class WishlistController {

    private final WishlistService wishlistService;

    public WishlistController(WishlistService wishlistService) {
        this.wishlistService = wishlistService;
    }

    private String getCurrentUserEmail() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            return auth.getName();
        }
        return null;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductDto>>> getWishlist(
            @RequestHeader(value = "X-Guest-Cart-Token", required = false) String guestToken) {
        
        String userEmail = getCurrentUserEmail();
        List<ProductDto> items = wishlistService.getWishlist(userEmail, guestToken);
        return ResponseEntity.ok(ApiResponse.success(items));
    }

    @PostMapping("/items/{productId}")
    public ResponseEntity<ApiResponse<Void>> addToWishlist(
            @PathVariable Long productId,
            @RequestHeader(value = "X-Guest-Cart-Token", required = false) String guestToken) {
        
        String userEmail = getCurrentUserEmail();
        wishlistService.addToWishlist(userEmail, guestToken, productId);
        return ResponseEntity.ok(ApiResponse.success("Added to wishlist successfully", null));
    }

    @DeleteMapping("/items/{productId}")
    public ResponseEntity<ApiResponse<Void>> removeFromWishlist(
            @PathVariable Long productId,
            @RequestHeader(value = "X-Guest-Cart-Token", required = false) String guestToken) {
        
        String userEmail = getCurrentUserEmail();
        wishlistService.removeFromWishlist(userEmail, guestToken, productId);
        return ResponseEntity.ok(ApiResponse.success("Removed from wishlist successfully", null));
    }

    @GetMapping("/count")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getWishlistCount(
            @RequestHeader(value = "X-Guest-Cart-Token", required = false) String guestToken) {
        
        String userEmail = getCurrentUserEmail();
        Map<String, Object> response = wishlistService.getWishlistCount(userEmail, guestToken);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
