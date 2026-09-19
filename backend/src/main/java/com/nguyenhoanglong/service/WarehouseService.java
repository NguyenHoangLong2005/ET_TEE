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
        if (quantity == null || quantity <= 0) throw new IllegalArgumentException("Số lượng nhập phải lớn hơn 0");
        Inventory i = inventories.findByVariantId(variantId).orElseGet(Inventory::new);
        if (i.getId() == null) {
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

    public InventoryAdjustment createAdjustmentRequest(UUID id, Integer difference, String reason, UUID requestedBy) {
        InventoryAdjustment a = new InventoryAdjustment();
        a.setInventory(inventory(id)); a.setDifference(difference); a.setReason(reason); a.setRequestedBy(requestedBy); a.setStatus("PENDING");
        return adjustments.save(a);
    }

    @Transactional
    public InventoryAdjustment approveAdjustment(UUID id, UUID approvedBy) {
        InventoryAdjustment a = adjustments.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phiếu điều chỉnh"));
        if (!"PENDING".equals(a.getStatus())) throw new IllegalArgumentException("Phiếu điều chỉnh đã được xử lý");
        Inventory i = a.getInventory();
        int next = i.getQuantityOnHand() + a.getDifference();
        if (next < 0) throw new IllegalArgumentException("Điều chỉnh làm tồn kho âm");
        i.setQuantityOnHand(next); inventories.save(i);
        a.setApprovedBy(approvedBy); a.setStatus("APPROVED"); return adjustments.save(a);
    }

    public List<StockReservation> getPendingReservations() { return reservations.findByStatusOrderByCreatedAtAsc(ReservationStatus.pending); }

    @Transactional
    public StockReservation approveReservation(UUID id) {
        StockReservation r = reservation(id);
        Inventory i = inventories.findByVariantId(r.getProductId()).orElseThrow(() -> new IllegalArgumentException("Sản phẩm chưa có trong kho"));
        int available = i.getQuantityOnHand() - i.getQuantityReserved();
        if (available < r.getQuantity()) throw new IllegalArgumentException("Không đủ tồn khả dụng để giữ hàng");
        i.setQuantityReserved(i.getQuantityReserved() + r.getQuantity()); inventories.save(i);
        r.setStatus(ReservationStatus.approved); reservations.save(r);
        Order order = r.getOrder(); order.setStatus(OrderStatus.confirmed); orders.save(order);
        return r;
    }

    public StockReservation rejectReservation(UUID id, String reason) {
        StockReservation r = reservation(id); r.setStatus(ReservationStatus.rejected); r.setRejectReason(reason); return reservations.save(r);
    }

    // order_status_transitions: confirmed -> picking -> packed
    public Order startPicking(UUID id) { return changeStatus(id, OrderStatus.confirmed, OrderStatus.picking); }
    public Order completePicking(UUID id) { return changeStatus(id, OrderStatus.picking, OrderStatus.packed); }
    public Order packOrder(UUID id) {
        Order order = order(id);
        if (order.getStatus() != OrderStatus.picking) throw new IllegalArgumentException("Đơn phải đang ở trạng thái picking trước khi đóng gói");
        order.setStatus(OrderStatus.packed); return orders.save(order);
    }

    public Map<String,Object> generateShippingLabel(UUID id) {
        Order order = order(id);
        if (order.getStatus() != OrderStatus.packed) throw new IllegalArgumentException("Chỉ in tem sau khi đóng gói");
        Map<String,Object> label = new LinkedHashMap<>();
        label.put("orderId", order.getId()); label.put("orderCode", order.getOrderCode());
        label.put("receiver", order.getCustomerName() != null ? order.getCustomerName() : order.getCustomerEmail());
        label.put("phone", order.getCustomerPhone()); label.put("address", order.getShippingAddress());
        label.put("codAmount", order.getTotal());
        return label;
    }

    // order_status_transitions: packed -> handed_to_carrier (order.handover)
    public Order readyToShip(UUID id) { return changeStatus(id, OrderStatus.packed, OrderStatus.handed_to_carrier); }
    public List<Stocktake> getStocktakes() { return stocktakes.findAll(); }

    public Stocktake createStocktake(String location, UUID createdBy) {
        Stocktake s = new Stocktake(); s.setWarehouseLocation(location); s.setCreatedBy(createdBy); return stocktakes.save(s);
    }

    public Stocktake updateStocktake(UUID id, Integer actualQuantity) {
        Stocktake s = stocktakes.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phiếu kiểm kê"));
        s.setActualQuantity(actualQuantity); s.setStatus("COMPLETED"); return stocktakes.save(s);
    }

    public List<Inventory> getReplenishmentSuggestions() {
        return inventories.findAll().stream().filter(i -> (i.getQuantityOnHand() - i.getQuantityReserved()) <= i.getReorderLevel()).toList();
    }

    public Inventory getInventoryByProduct(UUID variantId) { return inventories.findByVariantId(variantId).orElse(null); }

    // Danh sách đơn kho cần xử lý: đã xác nhận, đang lấy hàng hoặc đã đóng gói.
    public List<Order> getWarehouseOrders() {
        return orders.findByStatusInOrderByCreatedAtDesc(
                List.of(OrderStatus.confirmed, OrderStatus.picking, OrderStatus.packed));
    }

    public Inventory inventory(UUID id) { return inventories.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tồn kho " + id)); }
    private StockReservation reservation(UUID id) { return reservations.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy yêu cầu giữ hàng " + id)); }
    public Order order(UUID id) { return orders.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng " + id)); }
    private Order changeStatus(UUID id, OrderStatus expected, OrderStatus next) {
        Order o = order(id); if (o.getStatus() != expected) throw new IllegalArgumentException("Trạng thái hiện tại phải là " + expected); o.setStatus(next); return orders.save(o);
    }
}
