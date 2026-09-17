package com.ettee.opscore.order.entity;

/** Khớp enum Postgres: order_status */
public enum OrderStatus {
    draft, pending_payment, pending_confirmation, confirmed, picking,
    packed, handed_to_carrier, shipping, delivered,
    cancelled, return_requested, returned, refunded
}
