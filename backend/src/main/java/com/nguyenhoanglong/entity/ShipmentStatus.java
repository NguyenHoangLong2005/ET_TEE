package com.nguyenhoanglong.entity;

// Đồng bộ với enum shipment_status trong backend/sql/ettee_shop_schema.sql
public enum ShipmentStatus {
    pending,
    handed_over,
    in_transit,
    delivered,
    exception,
    returned
}
