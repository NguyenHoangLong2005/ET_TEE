package com.nguyenhoanglong.entity;

// Đồng bộ với enum shipment_status trong backend/sql/ettee_shop_schema.sql
public enum ShipmentStatus {
    PENDING,
    HANDED_OVER,
    IN_TRANSIT,
    DELIVERED,
    EXCEPTION,
    RETURNED
}
