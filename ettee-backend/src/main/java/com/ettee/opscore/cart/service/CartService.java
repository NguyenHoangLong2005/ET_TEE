package com.ettee.opscore.cart.service;

import com.ettee.opscore.cart.dto.*;
import com.ettee.opscore.cart.entity.Cart;
import com.ettee.opscore.cart.entity.CartItem;
import com.ettee.opscore.cart.repository.CartItemRepository;
import com.ettee.opscore.cart.repository.CartRepository;
import com.ettee.opscore.common.exception.AppExceptions;
import com.ettee.opscore.storeowner.product.entity.ProductVariant;
import com.ettee.opscore.storeowner.product.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CartService {
    private final CartRepository cartRepository;
    private final CartItemRepository itemRepository;
    private final ProductVariantRepository variantRepository;

    @Transactional(readOnly = true)
    public CartDto get(UUID userId) {
        return cartRepository.findByUserIdAndStatus(userId, "active")
                .map(this::toDto)
                .orElse(new CartDto(null, 0, java.util.List.of()));
    }

    @Transactional
    public CartDto update(UUID userId, CartItemRequest request) {
        Cart cart = cartRepository.findByUserIdAndStatus(userId, "active").orElseGet(() -> {
            Cart created = new Cart();
            created.setUserId(userId);
            return cartRepository.save(created);
        });
        CartItem item = itemRepository.findByCartIdAndVariantId(cart.getId(), request.variantId()).orElse(null);
        if (request.quantity() == 0) {
            if (item != null)
                itemRepository.delete(item);
        } else {
            ProductVariant variant = variantRepository.findById(request.variantId())
                    .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Biến thể sản phẩm",
                            request.variantId()));
            if (!variant.isActive())
                throw new AppExceptions.BusinessRuleViolationException("Sản phẩm đã ngừng bán");
            if (item == null) {
                item = new CartItem();
                item.setCartId(cart.getId());
                item.setVariantId(request.variantId());
                item.setAddedAt(Instant.now());
            }
            item.setQuantity(request.quantity());
            item.setPriceAtAdd(variant.getPrice());
            itemRepository.save(item);
        }
        return toDto(cart);
    }

    @Transactional
    public CartDto merge(UUID userId, CartMergeRequest request) {
        CartDto result = get(userId);
        for (CartItemRequest item : request.items()) {
            Cart existing = cartRepository.findByUserIdAndStatus(userId, "active").orElse(null);
            int current = existing == null ? 0
                    : itemRepository.findByCartIdAndVariantId(existing.getId(), item.variantId())
                            .map(CartItem::getQuantity).orElse(0);
            update(userId, new CartItemRequest(item.variantId(), current + item.quantity()));
        }
        return get(userId);
    }

    private CartDto toDto(Cart cart) {
        return new CartDto(cart.getId(), cart.getVersion(),
                itemRepository.findAllByCartIdOrderByAddedAtAsc(cart.getId()).stream()
                        .map(i -> new CartItemDto(i.getId(), i.getVariantId(), i.getQuantity(), i.getPriceAtAdd()))
                        .toList());
    }
}