package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.OrderStatus;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Order State Machine - Validates order status transitions
 * Flow: PENDING_CONFIRMATION → VERIFIED → CONFIRMED → PICKING → PACKED → HANDED_TO_CARRIER → SHIPPING → DELIVERED
 * Cancellation allowed from: PENDING_CONFIRMATION, VERIFIED, CONFIRMED, PICKING, PACKED, HANDED_TO_CARRIER, SHIPPING
 */
@Component
public class OrderStateMachine {

    // Define valid transitions: fromStatus -> Set of allowed next statuses
    private static final Map<OrderStatus, Set<OrderStatus>> TRANSITIONS = new LinkedHashMap<>();

    // Define statuses that can be cancelled
    private static final Set<OrderStatus> CANCELLABLE_STATUSES = new LinkedHashSet<>();

    // Define terminal statuses (no further transitions allowed except special cases)
    private static final Set<OrderStatus> TERMINAL_STATUSES = new LinkedHashSet<>();

    // Define order processing flow statuses
    private static final List<OrderStatus> ORDER_FLOW = List.of(
            OrderStatus.PENDING_CONFIRMATION,
            OrderStatus.CONFIRMED,
            OrderStatus.PICKING,
            OrderStatus.PACKED,
            OrderStatus.HANDED_TO_CARRIER,
            OrderStatus.SHIPPING,
            OrderStatus.DELIVERED
    );

    static {
        // Initialize valid transitions
        // PENDING_CONFIRMATION can go to: CONFIRMED, CANCELLED
        TRANSITIONS.put(OrderStatus.PENDING_CONFIRMATION,
                Set.of(OrderStatus.CONFIRMED, OrderStatus.CANCELLED));

        // DRAFT can go to: PENDING_PAYMENT, PENDING_CONFIRMATION, CANCELLED
        TRANSITIONS.put(OrderStatus.DRAFT,
                Set.of(OrderStatus.PENDING_PAYMENT, OrderStatus.PENDING_CONFIRMATION, OrderStatus.CANCELLED));

        // PENDING_PAYMENT can go to: PENDING_CONFIRMATION (payment received), CANCELLED
        TRANSITIONS.put(OrderStatus.PENDING_PAYMENT,
                Set.of(OrderStatus.PENDING_CONFIRMATION, OrderStatus.CANCELLED));

        // CONFIRMED can go to: PICKING, CANCELLED
        TRANSITIONS.put(OrderStatus.CONFIRMED,
                Set.of(OrderStatus.PICKING, OrderStatus.CANCELLED));

        // PICKING can go to: PACKED, CANCELLED
        TRANSITIONS.put(OrderStatus.PICKING,
                Set.of(OrderStatus.PACKED, OrderStatus.CANCELLED));

        // PACKED can go to: HANDED_TO_CARRIER, CANCELLED
        TRANSITIONS.put(OrderStatus.PACKED,
                Set.of(OrderStatus.HANDED_TO_CARRIER, OrderStatus.CANCELLED));

        // HANDED_TO_CARRIER can go to: SHIPPING, CANCELLED
        TRANSITIONS.put(OrderStatus.HANDED_TO_CARRIER,
                Set.of(OrderStatus.SHIPPING, OrderStatus.CANCELLED));

        // SHIPPING can go to: DELIVERED, CANCELLED
        TRANSITIONS.put(OrderStatus.SHIPPING,
                Set.of(OrderStatus.DELIVERED, OrderStatus.CANCELLED));

        // DELIVERED can go to: RETURN_REQUESTED
        TRANSITIONS.put(OrderStatus.DELIVERED,
                Set.of(OrderStatus.RETURN_REQUESTED));

        // RETURN_REQUESTED can go to: RETURNED, DELIVERED (if return rejected)
        TRANSITIONS.put(OrderStatus.RETURN_REQUESTED,
                Set.of(OrderStatus.RETURNED, OrderStatus.DELIVERED));

        // RETURNED can go to: REFUNDED
        TRANSITIONS.put(OrderStatus.RETURNED,
                Set.of(OrderStatus.REFUNDED));

        // CANCELLED is terminal
        TRANSITIONS.put(OrderStatus.CANCELLED, Set.of());

        // REFUNDED is terminal
        TRANSITIONS.put(OrderStatus.REFUNDED, Set.of());

        // Initialize cancellable statuses
        CANCELLABLE_STATUSES.addAll(List.of(
                OrderStatus.PENDING_CONFIRMATION,
                OrderStatus.PENDING_PAYMENT,
                OrderStatus.DRAFT,
                OrderStatus.CONFIRMED,
                OrderStatus.PICKING,
                OrderStatus.PACKED,
                OrderStatus.HANDED_TO_CARRIER,
                OrderStatus.SHIPPING
        ));

        // Initialize terminal statuses
        TERMINAL_STATUSES.addAll(List.of(
                OrderStatus.DELIVERED, // Can still go to RETURN_REQUESTED
                OrderStatus.CANCELLED,
                OrderStatus.REFUNDED
        ));
    }

    /**
     * Check if a transition from one status to another is valid
     * @param from Current status
     * @param to Target status
     * @return true if transition is valid
     */
    public boolean isValidTransition(OrderStatus from, OrderStatus to) {
        if (from == null || to == null) {
            return false;
        }
        Set<OrderStatus> allowedTransitions = TRANSITIONS.get(from);
        return allowedTransitions != null && allowedTransitions.contains(to);
    }

    /**
     * Validate transition and throw exception if invalid
     * @param from Current status
     * @param to Target status
     * @throws IllegalStateException if transition is invalid
     */
    public void validateTransition(OrderStatus from, OrderStatus to) {
        if (!isValidTransition(from, to)) {
            throw new IllegalStateException(
                    String.format("Invalid order status transition: %s → %s. Allowed transitions from %s: %s",
                            from, to, from, getAllowedTransitions(from)));
        }
    }

    /**
     * Get allowed next statuses for a given status
     * @param status Current status
     * @return Set of allowed next statuses
     */
    public Set<OrderStatus> getAllowedTransitions(OrderStatus status) {
        if (status == null) {
            return Set.of();
        }
        return TRANSITIONS.getOrDefault(status, Set.of());
    }

    /**
     * Check if an order can be cancelled from its current status
     * @param status Current status
     * @return true if order can be cancelled
     */
    public boolean canCancel(OrderStatus status) {
        return CANCELLABLE_STATUSES.contains(status);
    }

    /**
     * Validate cancellation and throw exception if not allowed
     * @param status Current status
     * @throws IllegalStateException if cancellation is not allowed
     */
    public void validateCancellation(OrderStatus status) {
        if (!canCancel(status)) {
            throw new IllegalStateException(
                    String.format("Order in status %s cannot be cancelled. Cancellable statuses: %s",
                            status, CANCELLABLE_STATUSES));
        }
    }

    /**
     * Check if status is terminal (no normal transitions possible)
     * @param status Status to check
     * @return true if terminal
     */
    public boolean isTerminal(OrderStatus status) {
        return TERMINAL_STATUSES.contains(status);
    }

    /**
     * Check if order is in a "completed" state (successfully delivered or fully processed)
     * @param status Status to check
     * @return true if completed
     */
    public boolean isCompleted(OrderStatus status) {
        return status == OrderStatus.DELIVERED ||
                status == OrderStatus.REFUNDED ||
                status == OrderStatus.CANCELLED;
    }

    /**
     * Check if order is in active processing (not completed, not cancelled)
     * @param status Status to check
     * @return true if in active processing
     */
    public boolean isInProgress(OrderStatus status) {
        return !isCompleted(status) &&
                status != OrderStatus.DRAFT &&
                status != OrderStatus.RETURN_REQUESTED &&
                status != OrderStatus.RETURNED;
    }

    /**
     * Get the next status in the normal order flow
     * @param current Current status
     * @return Next status in flow, or null if at end
     */
    public OrderStatus getNextInFlow(OrderStatus current) {
        int idx = ORDER_FLOW.indexOf(current);
        if (idx >= 0 && idx < ORDER_FLOW.size() - 1) {
            return ORDER_FLOW.get(idx + 1);
        }
        return null;
    }

    /**
     * Get all possible statuses
     * @return List of all order statuses
     */
    public List<OrderStatus> getAllStatuses() {
        return ORDER_FLOW;
    }

    /**
     * Check if status requires stock reservation
     * @param status Status to check
     * @return true if requires reservation
     */
    public boolean requiresReservation(OrderStatus status) {
        return status == OrderStatus.CONFIRMED ||
                status == OrderStatus.PICKING ||
                status == OrderStatus.PACKED;
    }

    /**
     * Get status display name (Vietnamese)
     * @param status Status
     * @return Vietnamese display name
     */
    public String getStatusDisplayName(OrderStatus status) {
        if (status == null) return "Không xác định";
        return switch (status) {
            case DRAFT -> "Bản nháp";
            case PENDING_PAYMENT -> "Chờ thanh toán";
            case PENDING_CONFIRMATION -> "Chờ xác nhận";
            case CONFIRMED -> "Đã xác nhận";
            case PICKING -> "Đang lấy hàng";
            case PACKED -> "Đã đóng gói";
            case HANDED_TO_CARRIER -> "Đã bàn giao";
            case SHIPPING -> "Đang giao hàng";
            case DELIVERED -> "Đã giao hàng";
            case CANCELLED -> "Đã hủy";
            case RETURN_REQUESTED -> "Yêu cầu hoàn trả";
            case RETURNED -> "Đã hoàn trả";
            case REFUNDED -> "Đã hoàn tiền";
        };
    }

    /**
     * Get status color for UI
     * @param status Status
     * @return CSS color class
     */
    public String getStatusColor(OrderStatus status) {
        if (status == null) return "gray";
        return switch (status) {
            case DRAFT -> "default";
            case PENDING_PAYMENT, PENDING_CONFIRMATION -> "warning";
            case CONFIRMED, PICKING, PACKED, HANDED_TO_CARRIER -> "info";
            case SHIPPING -> "primary";
            case DELIVERED -> "success";
            case CANCELLED -> "danger";
            case RETURN_REQUESTED, RETURNED -> "warning";
            case REFUNDED -> "info";
        };
    }
}
