package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.Order;
import com.nguyenhoanglong.entity.OrderItem;
import com.nguyenhoanglong.entity.OrderStatus;
import com.nguyenhoanglong.entity.ReservationStatus;
import com.nguyenhoanglong.entity.StockReservation;
import com.nguyenhoanglong.repository.InventoryRepository;
import com.nguyenhoanglong.repository.ProductVariantRepository;
import com.nguyenhoanglong.repository.StockReservationRepository;
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
    private final StockReservationRepository reservationRepository;

    public OrderStockService(ProductVariantRepository variantRepository, InventoryRepository inventoryRepository,
                             StockReservationRepository reservationRepository) {
        this.variantRepository = variantRepository;
        this.inventoryRepository = inventoryRepository;
        this.reservationRepository = reservationRepository;
    }

    /**
     * Closes the order's stock holds when it is cancelled. inventories.quantity_reserved is
     * only held while the order is PICKING (WarehouseService.startPicking adds it, packing
     * consumes it), so it is given back only for an order cancelled in that status. An
     * approved hold on a CONFIRMED order never touched quantity_reserved; releasing it used
     * to subtract stock another order was holding. Customer self-cancel skipped this
     * entirely and left the picked quantity reserved forever.
     */
    public void releaseReservations(Order order, OrderStatus statusBefore) {
        if (order.getId() == null) return;
        for (StockReservation r : reservationRepository.findByOrderId(order.getId())) {
            if (r.getStatus() == ReservationStatus.APPROVED && statusBefore == OrderStatus.PICKING) {
                int quantity = r.getQuantity() != null ? r.getQuantity() : 0;
                inventoryRepository.findByProductIdWithLock(r.getProductId()).ifPresent(inv -> {
                    inv.setQuantityReserved(Math.max(0, inv.getQuantityReserved() - quantity));
                    inventoryRepository.save(inv);
                });
            }
            if (r.getStatus() == ReservationStatus.APPROVED || r.getStatus() == ReservationStatus.PENDING) {
                r.setStatus(ReservationStatus.RELEASED);
                reservationRepository.save(r);
            }
        }
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
