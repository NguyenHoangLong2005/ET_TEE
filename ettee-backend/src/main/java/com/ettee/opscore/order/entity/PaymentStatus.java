package com.ettee.opscore.order.entity;

/** Khớp enum Postgres: payment_status */
public enum PaymentStatus {
    unpaid, paid, partial_refunded, refunded, failed
}
