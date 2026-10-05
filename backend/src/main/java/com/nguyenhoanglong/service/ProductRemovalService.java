package com.nguyenhoanglong.service;

import com.nguyenhoanglong.repository.CartItemRepository;
import com.nguyenhoanglong.repository.OrderRepository;
import com.nguyenhoanglong.repository.WishlistItemRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Rules shared by every way a product can be (soft-)deleted. Once its status is DELETED the
 * product is invisible to JPA (@SQLRestriction), so anything still pointing at it must be
 * either finished (orders) or removed (cart lines, wishlist entries).
 */
@Service
public class ProductRemovalService {

    public static final List<String> OPEN_ORDER_STATUSES = List.of(
            "PENDING_PAYMENT", "PENDING_CONFIRMATION", "CONFIRMED", "PICKING", "PACKED",
            "HANDED_TO_CARRIER", "SHIPPING", "RETURN_REQUESTED");

    private final OrderRepository orderRepository;
    private final CartItemRepository cartItemRepository;
    private final WishlistItemRepository wishlistItemRepository;

    public ProductRemovalService(OrderRepository orderRepository, CartItemRepository cartItemRepository,
                                 WishlistItemRepository wishlistItemRepository) {
        this.orderRepository = orderRepository;
        this.cartItemRepository = cartItemRepository;
        this.wishlistItemRepository = wishlistItemRepository;
    }

    /** Warehouse / sales steps of an open order read its product; it must not vanish under them. */
    public void assertNoOpenOrders(Long productId) {
        long open = orderRepository.countOpenOrdersByProductId(productId, OPEN_ORDER_STATUSES);
        if (open > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Không thể xóa sản phẩm. Có " + open
                    + " đơn hàng chưa hoàn tất chứa sản phẩm này. Hãy hoàn tất hoặc hủy các đơn đó trước.");
        }
    }

    /** Cart lines and wishlist entries of a deleted product used to make those pages fail. */
    public void detachFromCartsAndWishlists(Long productId) {
        cartItemRepository.deleteByProductId(productId);
        wishlistItemRepository.deleteAllByDeletedProductId(productId);
    }
}
