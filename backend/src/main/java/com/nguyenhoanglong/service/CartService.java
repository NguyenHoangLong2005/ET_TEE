package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.CartDto;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.CartItemRepository;
import com.nguyenhoanglong.repository.CartRepository;
import com.nguyenhoanglong.repository.ProductVariantRepository;
import com.nguyenhoanglong.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.nguyenhoanglong.exception.ApiException;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final UserRepository userRepository;
    private final ProductVariantRepository productVariantRepository;

    public CartService(CartRepository cartRepository, CartItemRepository cartItemRepository, UserRepository userRepository, ProductVariantRepository productVariantRepository) {
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.userRepository = userRepository;
        this.productVariantRepository = productVariantRepository;
    }

    @Transactional
    public CartDto.CartResponse getCart(String userEmail, String guestToken) {
        Cart cart = getOrCreateCart(userEmail, guestToken);
        return mapToResponse(cart);
    }

    @Transactional
    public CartDto.CartResponse addToCart(String userEmail, String guestToken, CartDto.AddToCartRequest request) {
        Cart cart = getOrCreateCart(userEmail, guestToken);

        ProductVariant variant = productVariantRepository.findById(request.getVariantId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Sản phẩm không tồn tại"));

        CartItem existingItem = cart.getItems().stream()
                .filter(item -> item.getProductVariant().getId().equals(variant.getId()))
                .findFirst()
                .orElse(null);

        int newQuantity = request.getQuantity();
        if (existingItem != null) {
            newQuantity += existingItem.getQuantity();
        }

        if (newQuantity > variant.getAvailableQuantity()) {
            throw new ApiException(HttpStatus.CONFLICT, "Số lượng yêu cầu vượt quá số lượng tồn kho");
        }

        if (existingItem != null) {
            existingItem.setQuantity(newQuantity);
        } else {
            CartItem newItem = new CartItem();
            newItem.setCart(cart);
            newItem.setProductVariant(variant);
            newItem.setQuantity(newQuantity);
            cart.getItems().add(newItem);
        }

        cartRepository.save(cart);
        return mapToResponse(cart);
    }

    @Transactional
    public CartDto.CartResponse updateCartItem(String userEmail, String guestToken, Long itemId, CartDto.UpdateCartItemRequest request) {
        Cart cart = getOrCreateCart(userEmail, guestToken);

        CartItem item = cart.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm trong giỏ hàng"));

        if (request.getQuantity() == 0) {
            cart.getItems().remove(item);
            cartItemRepository.delete(item);
        } else {
            if (request.getQuantity() > item.getProductVariant().getAvailableQuantity()) {
                throw new ApiException(HttpStatus.CONFLICT, "Số lượng yêu cầu vượt quá số lượng tồn kho");
            }
            item.setQuantity(request.getQuantity());
        }

        cartRepository.save(cart);
        return mapToResponse(cart);
    }

    @Transactional
    public CartDto.CartResponse removeFromCart(String userEmail, String guestToken, Long itemId) {
        Cart cart = getOrCreateCart(userEmail, guestToken);

        CartItem item = cart.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm trong giỏ hàng"));

        cart.getItems().remove(item);
        cartItemRepository.delete(item);

        cartRepository.save(cart);
        return mapToResponse(cart);
    }

    private Cart getOrCreateCart(String userEmail, String guestToken) {
        if (userEmail != null) {
            User user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Không tìm thấy thông tin người dùng"));
            return cartRepository.findByUserId(user.getId())
                    .orElseGet(() -> {
                        Cart newCart = new Cart();
                        newCart.setUser(user);
                        return cartRepository.save(newCart);
                    });
        } else if (guestToken != null && !guestToken.trim().isEmpty()) {
            return cartRepository.findByGuestToken(guestToken)
                    .orElseGet(() -> {
                        Cart newCart = new Cart();
                        newCart.setGuestToken(guestToken);
                        return cartRepository.save(newCart);
                    });
        } else {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Yêu cầu phải có thông tin xác thực hoặc guest token");
        }
    }

    /**
     * Merge the cart belonging to {@code guestToken} into the user's cart.
     *
     * Behavior:
     * <ul>
     *   <li>If no guest token is given, or the guest cart does not exist / is empty,
     *       the method returns {@link CartMergeResult#empty()} without any side effects.</li>
     *   <li>For each guest cart item:
     *     <ul>
     *       <li>If the user cart already has an item for the same variant, the quantities
     *           are summed. If that sum exceeds {@link ProductVariant#getAvailableQuantity()},
     *           the method caps the user-cart item at the available quantity and adds a
     *           warning instead of silently truncating.</li>
     *       <li>Otherwise, the item is moved into the user cart with its original quantity.
     *           If the original quantity exceeds available stock, it is also capped and a
     *           warning is added.</li>
     *     </ul>
     *   </li>
     *   <li>The original guest cart is deleted regardless of warnings so that the same cart
     *       is never merged twice.</li>
     * </ul>
     */
    @Transactional
    public CartMergeResult mergeGuestCartIntoUserCart(String userEmail, String guestToken) {
        if (guestToken == null || guestToken.trim().isEmpty()) {
            return CartMergeResult.empty();
        }

        Cart guestCart = cartRepository.findByGuestToken(guestToken).orElse(null);
        if (guestCart == null || guestCart.getItems().isEmpty()) {
            return CartMergeResult.empty();
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Không tìm thấy thông tin người dùng"));

        Cart userCart = cartRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    Cart newCart = new Cart();
                    newCart.setUser(user);
                    return cartRepository.save(newCart);
                });

        java.util.List<String> warnings = new java.util.ArrayList<>();
        int mergedItems = 0;
        int guestItemsProcessed = guestCart.getItems().size();

        for (CartItem guestItem : guestCart.getItems()) {
            ProductVariant variant = guestItem.getProductVariant();
            int requested = guestItem.getQuantity();
            int available = variant.getAvailableQuantity();

            CartItem existingItem = userCart.getItems().stream()
                    .filter(i -> i.getProductVariant().getId().equals(variant.getId()))
                    .findFirst()
                    .orElse(null);

            if (existingItem != null) {
                int combined = existingItem.getQuantity() + requested;
                if (combined > available) {
                    String productLabel = variant.getProduct() != null && variant.getProduct().getName() != null
                            ? variant.getProduct().getName()
                            : ("Variant #" + variant.getId());
                    String sizeLabel = variant.getSize() != null ? variant.getSize() : "?";
                    warnings.add(String.format(
                            java.util.Locale.ROOT,
                            "Sản phẩm '%s' (size %s): đã giảm từ %d về tối đa tồn kho %d.",
                            productLabel, sizeLabel, combined, available));
                    existingItem.setQuantity(available);
                } else {
                    existingItem.setQuantity(combined);
                }
            } else {
                if (requested > available) {
                    String productLabel = variant.getProduct() != null && variant.getProduct().getName() != null
                            ? variant.getProduct().getName()
                            : ("Variant #" + variant.getId());
                    String sizeLabel = variant.getSize() != null ? variant.getSize() : "?";
                    warnings.add(String.format(
                            java.util.Locale.ROOT,
                            "Sản phẩm '%s' (size %s): đã giảm từ %d về tối đa tồn kho %d.",
                            productLabel, sizeLabel, requested, available));
                    if (available > 0) {
                        CartItem newItem = new CartItem();
                        newItem.setCart(userCart);
                        newItem.setProductVariant(variant);
                        newItem.setQuantity(available);
                        userCart.getItems().add(newItem);
                    }
                    // If available == 0 we skip adding the line entirely; the warning informs the user.
                } else if (available > 0) {
                    CartItem newItem = new CartItem();
                    newItem.setCart(userCart);
                    newItem.setProductVariant(variant);
                    newItem.setQuantity(requested);
                    userCart.getItems().add(newItem);
                }
            }
            mergedItems++;
        }

        cartRepository.save(userCart);
        cartItemRepository.deleteAll(guestCart.getItems());
        cartRepository.delete(guestCart);

        return new CartMergeResult(warnings, mergedItems, guestItemsProcessed);
    }

    private CartDto.CartResponse mapToResponse(Cart cart) {
        List<CartDto.CartItemResponse> itemResponses = cart.getItems().stream()
                .map(this::mapItemToResponse)
                .collect(Collectors.toList());

        BigDecimal subtotal = itemResponses.stream()
                .map(CartDto.CartItemResponse::getItemTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int totalQuantity = itemResponses.stream()
                .mapToInt(CartDto.CartItemResponse::getQuantity)
                .sum();

        return new CartDto.CartResponse(
                cart.getId(),
                itemResponses,
                subtotal,
                totalQuantity
        );
    }

    private CartDto.CartItemResponse mapItemToResponse(CartItem item) {
        ProductVariant variant = item.getProductVariant();
        Product product = variant.getProduct();
        
        String imageUrl = "";
        if (product.getImages() != null && !product.getImages().isEmpty()) {
            imageUrl = product.getImages().get(0).getImageUrl();
        }

        BigDecimal activePrice = variant.getSalePrice() != null ? variant.getSalePrice() : variant.getPrice();
        BigDecimal itemTotal = activePrice.multiply(BigDecimal.valueOf(item.getQuantity()));

        return new CartDto.CartItemResponse(
                item.getId(),
                variant.getId(),
                product.getSlug(),
                product.getName(),
                imageUrl,
                variant.getColor(),
                variant.getColorHex(),
                variant.getSize(),
                variant.getPrice(),
                variant.getSalePrice(),
                item.getQuantity(),
                variant.getAvailableQuantity(),
                itemTotal
        );
    }
}
