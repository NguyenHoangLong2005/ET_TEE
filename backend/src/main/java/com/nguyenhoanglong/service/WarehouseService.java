package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class WarehouseService {
    private final InventoryRepository inventories;
    private final StockReservationRepository reservations;
    private final OrderRepository orders;
    private final InventoryAdjustmentRepository adjustments;
    private final StocktakeRepository stocktakes;

    public WarehouseService(InventoryRepository inventories, StockReservationRepository reservations, OrderRepository orders,
                            InventoryAdjustmentRepository adjustments, StocktakeRepository stocktakes) {
        this.inventories = inventories; this.reservations = reservations; this.orders = orders;
        this.adjustments = adjustments; this.stocktakes = stocktakes;
    }

    public List<Inventory> getInventory() { return inventories.findAll(); }
    public List<InventoryAdjustment> getAdjustments() { return adjustments.findAll(); }

    @Transactional
    public Inventory inbound(UUID variantId, Integer quantity, String location) {
        if (quantity == null || quantity <= 0) throw new IllegalArgumentException("So luong nhap phai lon hon 0");
        Inventory i = inventories.findByVariantId(variantId).orElseGet(Inventory::new);
        if (i.getInventoryId() == null) {
            i.setVariantId(variantId); i.setQuantityOnHand(0); i.setQuantityReserved(0); i.setReorderLevel(10);
        }
        i.setQuantityOnHand(i.getQuantityOnHand() + quantity);
        return inventories.save(i);
    }

    public Map<String,Object> countInbound(UUID inventoryId, Integer actualQuantity) {
        Inventory i = inventory(inventoryId);
        Map<String,Object> result = new LinkedHashMap<>();
        result.put("inventory", i);
        result.put("actualQuantity", actualQuantity);
        result.put("difference", actualQuantity - i.getQuantityOnHand());
        return result;
    }

    public Inventory updateLocation(UUID id, String location) {
        Inventory i = inventory(id); return inventories.save(i);
    }

    public InventoryAdjustment createAdjustmentRequest(UUID id, Integer difference, String reason, Long requestedBy) {
        Inventory i = inventory(id);
        InventoryAdjustment a = new InventoryAdjustment();
        a.setInventoryId(i.getInventoryId()); a.setDifference(difference); a.setReason(reason); a.setRequestedBy(requestedBy); a.setStatus("PENDING");
        return adjustments.save(a);
    }

    @Transactional
    public InventoryAdjustment approveAdjustment(Long id, Long approvedBy) {
        InventoryAdjustment a = adjustments.findById(id).orElseThrow(() -> new IllegalArgumentException("Khong tim thay phieu dieu chinh"));
        if (!"PENDING".equals(a.getStatus())) throw new IllegalArgumentException("Phieu dieu chinh da duoc xu ly");
        Inventory i = inventories.findById(a.getInventoryId()).orElseThrow(() -> new IllegalArgumentException("Khong tim thay san pham trong kho"));
        int next = i.getQuantityOnHand() + a.getDifference();
        if (next < 0) throw new IllegalArgumentException("Dieu chinh lam ton kho am");
        i.setQuantityOnHand(next); inventories.save(i);
        a.setApprovedBy(approvedBy); a.setStatus("APPROVED"); return adjustments.save(a);
    }

    public List<StockReservation> getPendingReservations() { return reservations.findByStatusOrderByCreatedAtAsc(ReservationStatus.PENDING); }

    @Transactional
    public StockReservation approveReservation(Long id) {
        StockReservation r = reservation(id);
        Inventory i = inventories.findByProductId(r.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("San pham chua co trong kho"));
        int available = i.getQuantityOnHand() - i.getQuantityReserved();
        if (available < r.getQuantity()) throw new IllegalArgumentException("Khong du ton de giu hang");
        i.setQuantityReserved(i.getQuantityReserved() + r.getQuantity()); inventories.save(i);
        r.setStatus(ReservationStatus.APPROVED); reservations.save(r);
        Order order = order(r.getOrderId()); order.setStatus(OrderStatus.CONFIRMED); orders.save(order);
        return r;
    }

    public StockReservation rejectReservation(Long id, String reason) {
        StockReservation r = reservation(id); r.setStatus(ReservationStatus.REJECTED); r.setRejectReason(reason); return reservations.save(r);
    }

    // order_status_transitions: confirmed -> picking -> packed
    public Order startPicking(Long id) { return changeStatus(id, OrderStatus.CONFIRMED, OrderStatus.PICKING); }
    public Order completePicking(Long id) { return changeStatus(id, OrderStatus.PICKING, OrderStatus.PACKED); }
    public Order packOrder(Long id) {
        Order order = order(id);
        if (order.getStatus() != OrderStatus.PICKING) throw new IllegalArgumentException("Don phai dang o trang thai picking truoc khi dong goi");
        order.setStatus(OrderStatus.PACKED); return orders.save(order);
    }

    public Map<String,Object> generateShippingLabel(Long id) {
        Order order = order(id);
        if (order.getStatus() != OrderStatus.PACKED) throw new IllegalArgumentException("Chi in tem sau khi dong goi");
        Map<String,Object> label = new LinkedHashMap<>();
        label.put("orderId", order.getOrderId()); label.put("orderCode", order.getOrderCode());
        label.put("receiver", order.getCustomerName() != null ? order.getCustomerName() : order.getCustomerEmail());
        label.put("phone", order.getCustomerPhone()); label.put("address", order.getShippingAddress());
        label.put("codAmount", order.getTotal());
        return label;
    }

    // order_status_transitions: packed -> handed_to_carrier (order.handover)
    public Order readyToShip(Long id) { return changeStatus(id, OrderStatus.PACKED, OrderStatus.HANDED_TO_CARRIER); }
    public List<Stocktake> getStocktakes() { return stocktakes.findAll(); }

    public Stocktake createStocktake(String location, Long createdBy) {
        Stocktake s = new Stocktake(); s.setWarehouseLocation(location); s.setCreatedBy(createdBy); return stocktakes.save(s);
    }

    public Stocktake updateStocktake(Long id, Integer actualQuantity) {
        Stocktake s = stocktakes.findById(id).orElseThrow(() -> new IllegalArgumentException("Khong tim thay phieu kiem ke"));
        s.setActualQuantity(actualQuantity); s.setStatus("COMPLETED"); return stocktakes.save(s);
    }

    public List<Inventory> getReplenishmentSuggestions() {
        return inventories.findAll().stream().filter(i -> (i.getQuantityOnHand() - i.getQuantityReserved()) <= i.getReorderLevel()).toList();
    }

    public Inventory getInventoryByProduct(UUID variantId) { return inventories.findByVariantId(variantId).orElse(null); }

    // Danh sach don kho can xu ly: da xac nhan, dang lay hang hoac da dong goi.
    public List<Order> getWarehouseOrders() {
        return orders.findByStatusInOrderByCreatedAtDesc(
                List.of(OrderStatus.CONFIRMED, OrderStatus.PICKING, OrderStatus.PACKED));
    }

    public Inventory inventory(UUID id) { return inventories.findById(id).orElseThrow(() -> new IllegalArgumentException("Khong tim thay ton kho " + id)); }
    private StockReservation reservation(Long id) { return reservations.findById(id).orElseThrow(() -> new IllegalArgumentException("Khong tim thay yeu cau giu hang " + id)); }
    public Order order(Long id) { return orders.findById(id).orElseThrow(() -> new IllegalArgumentException("Khong tim thay don hang " + id)); }
    private Order changeStatus(Long id, OrderStatus expected, OrderStatus next) {
        Order o = order(id); if (o.getStatus() != expected) throw new IllegalArgumentException("Trang thai hien tai phai la " + expected); o.setStatus(next); return orders.save(o);
    }
}
