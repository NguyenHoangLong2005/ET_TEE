package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.Order;
import com.nguyenhoanglong.entity.OrderItem;
import com.nguyenhoanglong.entity.OrderStatus;
import com.nguyenhoanglong.repository.InventoryRepository;
import com.nguyenhoanglong.repository.ProductVariantRepository;
import org.springframework.stereotype.Service;

import java.util.EnumSet;
import java.util.Set;

/**
 * Gives stock back when goods of an order come back or are never shipped.
 *
 * Two ledgers are involved: product_variants.stock / available_quantity (what the
 * storefront sells, deducted at checkout) and inventories.quantity_on_hand (the
 * warehouse shelf, deducted when the order is packed).
 */
@Service
public class OrderStockService {

    /** Statuses in which the warehouse has already taken the goods off the shelf. */
    public static final Set<OrderStatus> LEFT_SHELF = EnumSet.of(
            OrderStatus.PACKED, OrderStatus.HANDED_TO_CARRIER, OrderStatus.SHIPPING,
            OrderStatus.DELIVERED, OrderStatus.RETURN_REQUESTED);

    private final ProductVariantRepository variantRepository;
    private final InventoryRepository inventoryRepository;

    public OrderStockService(ProductVariantRepository variantRepository, InventoryRepository inventoryRepository) {
        this.variantRepository = variantRepository;
        this.inventoryRepository = inventoryRepository;
    }

    /** Undo the checkout deduction, under the same row lock checkout uses. */
    public void restoreVariantStock(Order order) {
        if (order.getItems() == null) return;
        for (OrderItem item : order.getItems()) {
            Long variantId = item.getVariantId();
            int quantity = item.getQuantity() != null ? item.getQuantity() : 0;
            if (variantId == null || variantId <= 0L || quantity <= 0) continue;
            variantRepository.findByIdWithPessimisticLock(variantId).ifPresent(variant -> {
                variant.setStock(variant.getStock() + quantity);
                variant.setAvailableQuantity(variant.getAvailableQuantity() + quantity);
                variantRepository.save(variant);
            });
        }
    }

    /** Put the goods back on the warehouse shelf, if the order had already left it. */
    public void restoreWarehouseOnHand(Order order, OrderStatus statusBefore) {
        if (!LEFT_SHELF.contains(statusBefore) || order.getItems() == null) return;
        for (OrderItem item : order.getItems()) {
            int quantity = item.getQuantity() != null ? item.getQuantity() : 0;
            if (item.getProduct() == null || quantity <= 0) continue;
            inventoryRepository.findByProductIdWithLock(item.getProduct().getId()).ifPresent(inv -> {
                inv.setQuantityOnHand(inv.getQuantityOnHand() + quantity);
                inventoryRepository.save(inv);
            });
        }
    }
}
