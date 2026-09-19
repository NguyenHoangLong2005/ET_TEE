package com.nguyenhoanglong.entity;

// Đồng bộ với enum order_status trong backend/sql/ettee_shop_schema.sql
public enum OrderStatus {
    draft,
    pending_payment,
    pending_confirmation,
    confirmed,
    picking,
    packed,
    handed_to_carrier,
    shipping,
    delivered,
    cancelled,
    return_requested,
    returned,
    refunded
}
