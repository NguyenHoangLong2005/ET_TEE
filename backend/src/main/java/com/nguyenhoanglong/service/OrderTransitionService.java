package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Order Transition Service - Validates and executes order status transitions
 * Uses OrderStateMachine for validation
 */
@Service
public class OrderTransitionService {
    
    private static final Logger log = LoggerFactory.getLogger(OrderTransitionService.class);
    
    private final OrderRepository orderRepository;
    private final OrderStatusHistoryRepository historyRepository;
    private final InventoryRepository inventoryRepository;
    private final StockReservationRepository reservationRepository;
    private final ProductRepository productRepository;
    private final OrderStateMachine stateMachine;
    private final SoldCountService soldCountService;

    public OrderTransitionService(
            OrderRepository orderRepository,
            OrderStatusHistoryRepository historyRepository,
            InventoryRepository inventoryRepository,
            StockReservationRepository reservationRepository,
            ProductRepository productRepository,
            OrderStateMachine stateMachine,
            SoldCountService soldCountService) {
        this.orderRepository = orderRepository;
        this.historyRepository = historyRepository;
        this.inventoryRepository = inventoryRepository;
        this.reservationRepository = reservationRepository;
        this.productRepository = productRepository;
        this.stateMachine = stateMachine;
        this.soldCountService = soldCountService;
    }

    /**
     * Transition order to new status with validation
     * @param orderId Order ID
     * @param targetStatus Target status
     * @param userId User performing the action
     * @param reason Optional reason for the transition
     * @return Updated order
     */
    @Transactional
    public Order transitionTo(Long orderId, OrderStatus targetStatus, String userId, String reason) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng: " + orderId));
        
        OrderStatus currentStatus = order.getStatus();
        
        // Validate transition using state machine
        stateMachine.validateTransition(currentStatus, targetStatus);
        
        // Execute pre-transition actions
        executePreTransitionActions(order, currentStatus, targetStatus);
        
        // Update status
        order.setStatus(targetStatus);
        order.setUpdatedAt(LocalDateTime.now());

        // Dong bo so luong da ban trong cung transaction voi viec doi trang thai.
        soldCountService.syncForStatus(order, targetStatus);
        
        // Record history
        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrderId(orderId);
        history.setFromStatus(currentStatus.name());
        history.setStatus(targetStatus.name());
        history.setChangedBy(userId);
        history.setReason(reason);
        historyRepository.save(history);
        
        // Execute post-transition actions
        executePostTransitionActions(order, currentStatus, targetStatus);
        
        log.info("Order {} transitioned from {} to {} by user {}", 
                orderId, currentStatus, targetStatus, userId);
        
        return orderRepository.save(order);
    }

    /**
     * Execute pre-transition actions (validations, reservations, etc.)
     */
    private void executePreTransitionActions(Order order, OrderStatus from, OrderStatus to) {
        switch (to) {
            case CONFIRMED:
                // Validate inventory availability before confirming
                validateInventoryForConfirmation(order);
                break;
            case PICKING:
                // Reserve stock when moving to picking
                reserveStockForPicking(order);
                break;
            case CANCELLED:
                // Release any reservations
                releaseReservations(order);
                break;
            case HANDED_TO_CARRIER:
                // Verify all items are packed
                verifyAllItemsPacked(order);
                break;
            default:
                break;
        }
    }

    /**
     * Execute post-transition actions (notifications, updates, etc.)
     */
    private void executePostTransitionActions(Order order, OrderStatus from, OrderStatus to) {
        switch (to) {
            case DELIVERED:
                // Finalize inventory (deduct reserved stock)
                finalizeInventoryDeduction(order);
                break;
            case CANCELLED:
                // Update inventory to restore stock
                break;
            default:
                break;
        }
    }

    /**
     * Validate inventory before order confirmation
     */
    private void validateInventoryForConfirmation(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            return;
        }
        
        for (OrderItem item : order.getItems()) {
            Inventory inventory = inventoryRepository.findByProductId(item.getProduct().getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Không tìm thấy inventory cho sản phẩm: " + item.getProduct().getName()));
            
            int availableStock = inventory.getQuantityOnHand() - inventory.getQuantityReserved();
            if (item.getQuantity() > availableStock) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        String.format("Sản phẩm '%s' không đủ hàng. Yêu cầu: %d, Còn lại: %d",
                                item.getProduct().getName(), item.getQuantity(), availableStock));
            }
        }
    }

    /**
     * Reserve stock when moving to picking
     */
    private void reserveStockForPicking(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            return;
        }
        
        for (OrderItem item : order.getItems()) {
            Inventory inventory = inventoryRepository.findByProductId(item.getProduct().getId())
                    .orElse(null);
            
            if (inventory != null) {
                inventory.setQuantityReserved(inventory.getQuantityReserved() + item.getQuantity());
                inventoryRepository.save(inventory);
            }
        }
    }

    /**
     * Release stock reservations when order is cancelled
     */
    private void releaseReservations(Order order) {
        List<StockReservation> reservations = reservationRepository.findByOrderId(order.getId());
        
        for (StockReservation reservation : reservations) {
            Inventory inventory = inventoryRepository.findByProductId(reservation.getProductId())
                    .orElse(null);
            
            if (inventory != null) {
                int newReserved = Math.max(0, inventory.getQuantityReserved() - reservation.getQuantity());
                inventory.setQuantityReserved(newReserved);
                inventoryRepository.save(inventory);
            }
            
                reservation.setStatus(ReservationStatus.RELEASED);
                reservationRepository.save(reservation);
        }
    }


    /**
     * Verify all items are packed before handover
     */
    private void verifyAllItemsPacked(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn hàng không có sản phẩm nào");
        }
        // Additional verification logic can be added here
    }

    /**
     * Finalize inventory deduction when order is delivered
     */
    private void finalizeInventoryDeduction(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            return;
        }
        
        for (OrderItem item : order.getItems()) {
            Inventory inventory = inventoryRepository.findByProductId(item.getProduct().getId())
                    .orElse(null);
            
            if (inventory != null) {
                // Deduct from on-hand and reserved
                int newOnHand = Math.max(0, inventory.getQuantityOnHand() - item.getQuantity());
                int newReserved = Math.max(0, inventory.getQuantityReserved() - item.getQuantity());
                inventory.setQuantityOnHand(newOnHand);
                inventory.setQuantityReserved(newReserved);
                inventoryRepository.save(inventory);
            }
        }
    }

    /**
     * Cancel order with validation
     */
    @Transactional
    public Order cancelOrder(Long orderId, String userId, String reason) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng: " + orderId));
        
        // Validate cancellation using state machine
        stateMachine.validateCancellation(order.getStatus());
        
        return transitionTo(orderId, OrderStatus.CANCELLED, userId, reason != null ? reason : "Khách hủy đơn");
    }

    /**
     * Get allowed transitions for an order
     */
    public List<OrderStatus> getAllowedTransitions(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng: " + orderId));
        
        return List.copyOf(stateMachine.getAllowedTransitions(order.getStatus()));
    }

    /**
     * Check if order can transition to target status
     */
    public boolean canTransitionTo(Long orderId, OrderStatus targetStatus) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            return false;
        }
        return stateMachine.isValidTransition(order.getStatus(), targetStatus);
    }

    /**
     * Get order status history
     */
    public List<OrderStatusHistory> getOrderHistory(Long orderId) {
        return historyRepository.findByOrderIdOrderByCreatedAtAsc(orderId);
    }
}
