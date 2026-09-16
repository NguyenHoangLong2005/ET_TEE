package com.ettee.opscore.cart.controller;

import com.ettee.opscore.cart.dto.*;
import com.ettee.opscore.cart.service.CartService;
import com.ettee.opscore.common.dto.ApiResponse;
import com.ettee.opscore.security.JwtPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {
    private final CartService cartService;

    @GetMapping
    public ApiResponse<CartDto> get(@AuthenticationPrincipal JwtPrincipal principal) {
        return ApiResponse.ok(cartService.get(principal.userId()));
    }

    @PutMapping("/items")
    public ApiResponse<CartDto> update(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody CartItemRequest request) {
        return ApiResponse.ok(cartService.update(principal.userId(), request));
    }

    @PostMapping("/merge")
    public ApiResponse<CartDto> merge(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody CartMergeRequest request) {
        return ApiResponse.ok(cartService.merge(principal.userId(), request));
    }
}