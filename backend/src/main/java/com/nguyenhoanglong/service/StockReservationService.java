package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Stock Reservation Service - Handles stock reservation with TTL auto-release
 */
@Service
public class StockReservationService {
    private static final Logger log = LoggerFactory.getLogger(StockReservationService.class);

    private final StockReservationRepository reservationRepository;
    private final InventoryRepository inventoryRepository;
    private final OrderRepository orderRepository;

    public StockReservationService(
            StockReservationRepository reservationRepository,
            InventoryRepository inventoryRepository,
            OrderRepository orderRepository) {
        this.reservationRepository = reservationRepository;
        this.inventoryRepository = inventoryRepository;
        this.orderRepository = orderRepository;
    }

    /**
     * Create a new stock reservation
     */
    @Transactional
    public StockReservation createReservation(Long orderId, Long productId, Integer quantity, Integer ttlMinutes) {
        // Validate order status
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng: " + orderId));
        
        if (order.getStatus() != OrderStatus.CONFIRMED) {
            throw new IllegalArgumentException("Đơn hàng phải ở trạng thái CONFIRMED để giữ hàng");
        }

        // Check and lock inventory
        Inventory inventory = inventoryRepository.findByProductIdWithLock(productId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tồn kho cho sản phẩm: " + productId));

        // Calculate available stock
        int available = inventory.getQuantityOnHand() - inventory.getQuantityReserved();
        if (quantity > available) {
            throw new IllegalArgumentException(String.format(
                    "Không đủ tồn kho. Yêu cầu: %d, Còn lại: %d", quantity, available));
        }

        // Create reservation
        StockReservation reservation = new StockReservation();
        reservation.setOrder(order);
        reservation.setProductId(productId);
        reservation.setQuantity(quantity);
        reservation.setStatus(ReservationStatus.PENDING);

        // Update reserved quantity
        inventory.setQuantityReserved(inventory.getQuantityReserved() + quantity);
        inventoryRepository.save(inventory);

        log.info("Stock reservation created: order={}, product={}, qty={}, expiresIn={}min",
                orderId, productId, quantity, ttlMinutes);

        return reservationRepository.save(reservation);
    }

    /**
     * Approve a pending reservation
     */
    @Transactional
    public StockReservation approveReservation(Long reservationId) {
        StockReservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy reservation: " + reservationId));

        if (reservation.getStatus() != ReservationStatus.PENDING) {
            throw new IllegalArgumentException("Reservation không ở trạng thái PENDING");
        }

        // Lock inventory
        Inventory inventory = inventoryRepository.findByProductIdWithLock(reservation.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tồn kho"));

        // Re-validate availability
        int available = inventory.getQuantityOnHand() - inventory.getQuantityReserved();
        if (reservation.getQuantity() > available) {
            throw new IllegalArgumentException("Không đủ tồn khả dụng");
        }

        reservation.setStatus(ReservationStatus.APPROVED);
        log.info("Reservation {} approved for product {}", reservationId, reservation.getProductId());

        return reservationRepository.save(reservation);
    }

    /**
     * Reject a pending reservation
     */
    @Transactional
    public StockReservation rejectReservation(Long reservationId, String reason) {
        StockReservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy reservation: " + reservationId));

        if (reservation.getStatus() != ReservationStatus.PENDING) {
            throw new IllegalArgumentException("Reservation không ở trạng thái PENDING");
        }

        // Release reserved quantity
        Inventory inventory = inventoryRepository.findByProductIdWithLock(reservation.getProductId())
                .orElse(null);
        
        if (inventory != null) {
            int newReserved = Math.max(0, inventory.getQuantityReserved() - reservation.getQuantity());
            inventory.setQuantityReserved(newReserved);
            inventoryRepository.save(inventory);
        }

        reservation.setStatus(ReservationStatus.REJECTED);
        reservation.setRejectReason(reason);

        log.info("Reservation {} rejected: {}", reservationId, reason);
        return reservationRepository.save(reservation);
    }

    /**
     * Release a reservation (e.g., when order is cancelled)
     */
    @Transactional
    public void releaseReservation(Long reservationId) {
        StockReservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy reservation: " + reservationId));

        if (reservation.getStatus() == ReservationStatus.RELEASED ||
            reservation.getStatus() == ReservationStatus.REJECTED) {
            return; // Already released
        }

        // Release reserved quantity
        Inventory inventory = inventoryRepository.findByProductIdWithLock(reservation.getProductId())
                .orElse(null);
        
        if (inventory != null) {
            int newReserved = Math.max(0, inventory.getQuantityReserved() - reservation.getQuantity());
            inventory.setQuantityReserved(newReserved);
            inventoryRepository.save(inventory);
        }

        reservation.setStatus(ReservationStatus.RELEASED);
        reservationRepository.save(reservation);

        log.info("Reservation {} released", reservationId);
    }

    /**
     * Release all reservations for an order
     */
    @Transactional
    public void releaseAllReservationsForOrder(Long orderId) {
        List<StockReservation> reservations = reservationRepository.findByOrderId(orderId);
        
        for (StockReservation reservation : reservations) {
            if (reservation.getStatus() != ReservationStatus.RELEASED &&
                reservation.getStatus() != ReservationStatus.REJECTED) {
                releaseReservation(reservation.getId());
            }
        }
        
        log.info("All reservations released for order {}", orderId);
    }

    /**
     * Commit reservation (deduct from inventory when order is delivered)
     */
    @Transactional
    public void commitReservation(Long reservationId) {
        StockReservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy reservation: " + reservationId));

        if (reservation.getStatus() != ReservationStatus.APPROVED) {
            throw new IllegalArgumentException("Reservation phải được APPROVED trước khi commit");
        }

        // Lock and update inventory
        Inventory inventory = inventoryRepository.findByProductIdWithLock(reservation.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tồn kho"));

        // Deduct from both on-hand and reserved
        int newOnHand = Math.max(0, inventory.getQuantityOnHand() - reservation.getQuantity());
        int newReserved = Math.max(0, inventory.getQuantityReserved() - reservation.getQuantity());
        
        inventory.setQuantityOnHand(newOnHand);
        inventory.setQuantityReserved(newReserved);
        inventoryRepository.save(inventory);

        log.info("Reservation {} committed: deducted {} from product {}", 
                reservationId, reservation.getQuantity(), reservation.getProductId());
    }

    /**
     * Scheduled task to release expired reservations
     * Runs every 5 minutes
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    @Transactional
    public void releaseExpiredReservations() {
        // In a real implementation, you would check expiration time
        // For now, this is a placeholder for TTL auto-release logic
        
        List<StockReservation> pendingReservations = reservationRepository
                .findByStatusOrderByCreatedAtAsc(ReservationStatus.PENDING);

        // Example: Release reservations older than TTL
        // This would be implemented based on your TTL logic
        for (StockReservation reservation : pendingReservations) {
            // Check if reservation has expired based on your TTL logic
            // For example: if (reservation.getCreatedAt().plusMinutes(ttl).isBefore(LocalDateTime.now()))
            // Then release it
        }
    }

    /**
     * Get pending reservations
     */
    public List<StockReservation> getPendingReservations() {
        return reservationRepository.findByStatusOrderByCreatedAtAsc(ReservationStatus.PENDING);
    }

    /**
     * Get all reservations for an order
     */
    public List<StockReservation> getReservationsForOrder(Long orderId) {
        return reservationRepository.findByOrderId(orderId);
    }
}
