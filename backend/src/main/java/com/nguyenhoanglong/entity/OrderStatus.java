package com.nguyenhoanglong.entity;

// Đồng bộ với enum order_status trong backend/sql/ettee_shop_schema.sql
public enum OrderStatus {
    DRAFT,
    PENDING_PAYMENT,
    PENDING_CONFIRMATION,
    CONFIRMED,
    PICKING,
    PACKED,
    HANDED_TO_CARRIER,
    SHIPPING,
    DELIVERED,
    CANCELLED,
    RETURN_REQUESTED,
    RETURNED,
    REFUNDED
}
