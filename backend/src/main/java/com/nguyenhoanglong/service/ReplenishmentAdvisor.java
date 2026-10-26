package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.Inventory;
import com.nguyenhoanglong.entity.OrderStatus;
import com.nguyenhoanglong.repository.OrderItemRepository;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;

/**
 * How many units to restock for an item that fell to its reorder level.
 *
 * Order-up-to rule on the item's real sales, not a fixed number: average daily demand over the
 * last {@value #WINDOW_DAYS} days at that branch, and enough stock to cover
 * {@value #LEAD_DAYS} days of waiting for the restock (owner approval + supplier) plus
 * {@value #COVER_DAYS} days of selling until the next one, plus {@value #SAFETY_DAYS} days of
 * safety stock. The target never goes below reorder level + 1, so a restocked item is not flagged
 * again straight away.
 *
 * Items that sold nothing in the window have no demand to project; they keep the old threshold
 * rule (top up to twice the reorder level) and say so, instead of dressing it up as a forecast.
 */
@Component
public class ReplenishmentAdvisor {

    static final int WINDOW_DAYS = 30;
    static final int LEAD_DAYS = 7;
    static final int COVER_DAYS = 14;
    static final int SAFETY_DAYS = 7;

    /** Not a sale: never placed, cancelled, or sent back. */
    static final List<OrderStatus> NOT_SOLD = List.of(
            OrderStatus.DRAFT, OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED,
            OrderStatus.RETURNED, OrderStatus.REFUNDED);

    private final OrderItemRepository orderItems;

    public ReplenishmentAdvisor(OrderItemRepository orderItems) {
        this.orderItems = orderItems;
    }

    /** Same fields as the inventory row the page used before, plus the suggestion and its basis. */
    public record Suggestion(
            Long id, Long productId, String productName, String warehouseLocation, Long shopId,
            int quantityOnHand, int quantityReserved, int reorderLevel,
            int available,
            /** units ordered at this branch in the last windowDays */
            int soldInWindow, int windowDays,
            /** average units per day over the window */
            double dailyDemand,
            /** stock the suggestion tops up to */
            int targetStock,
            /** days of selling the target covers at the current pace (0 without sales) */
            int coverDays,
            int suggestedQuantity,
            /** SALES = from the sales pace; THRESHOLD = no sales in the window, threshold rule */
            String basis) {}

    public List<Suggestion> suggest(List<Inventory> items) {
        if (items.isEmpty()) return List.of();
        Set<Long> productIds = new HashSet<>();
        items.forEach(i -> productIds.add(i.getProductId()));

        // productId -> shopId -> units; and productId -> all branches together for rows without a shop
        Map<Long, Map<Long, Long>> byShop = new HashMap<>();
        Map<Long, Long> allShops = new HashMap<>();
        for (Object[] row : orderItems.sumQuantityByProductAndShopSince(
                productIds, LocalDateTime.now().minusDays(WINDOW_DAYS), NOT_SOLD)) {
            Long productId = (Long) row[0];
            Long shopId = (Long) row[1];
            long qty = row[2] == null ? 0 : ((Number) row[2]).longValue();
            byShop.computeIfAbsent(productId, k -> new HashMap<>()).merge(shopId, qty, Long::sum);
            allShops.merge(productId, qty, Long::sum);
        }

        List<Suggestion> out = new ArrayList<>(items.size());
        for (Inventory inv : items) {
            long sold = inv.getShopId() == null
                    ? allShops.getOrDefault(inv.getProductId(), 0L)
                    : byShop.getOrDefault(inv.getProductId(), Map.of()).getOrDefault(inv.getShopId(), 0L);
            out.add(suggestion(inv, sold));
        }
        return out;
    }

    static Suggestion suggestion(Inventory inv, long sold) {
        int onHand = nz(inv.getQuantityOnHand());
        int reserved = nz(inv.getQuantityReserved());
        int reorder = inv.getReorderLevel() == null ? 10 : inv.getReorderLevel();
        int available = onHand - reserved;
        int usable = Math.max(0, available);

        double daily = sold / (double) WINDOW_DAYS;
        int target;
        int coverDays;
        String basis;
        if (sold > 0) {
            int horizon = LEAD_DAYS + COVER_DAYS + SAFETY_DAYS;
            target = Math.max(reorder + 1, (int) Math.ceil(daily * horizon));
            coverDays = (int) Math.floor(target / daily);
            basis = "SALES";
        } else {
            target = reorder * 2;
            coverDays = 0;
            basis = "THRESHOLD";
        }
        int suggested = Math.max(1, target - usable);
        return new Suggestion(inv.getId(), inv.getProductId(), inv.getProductName(), inv.getWarehouseLocation(),
                inv.getShopId(), onHand, reserved, reorder, available, (int) sold, WINDOW_DAYS,
                Math.round(daily * 100) / 100.0, target, coverDays, suggested, basis);
    }

    private static int nz(Integer v) {
        return v == null ? 0 : v;
    }
}
