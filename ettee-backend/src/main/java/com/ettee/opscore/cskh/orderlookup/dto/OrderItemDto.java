package com.ettee.opscore.cskh.orderlookup.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record OrderItemDto(
        UUID id, UUID variantId, String productNameSnapshot, String skuSnapshot,
        BigDecimal unitPrice, int quantity, BigDecimal discountAmount, BigDecimal lineTotal
) {
}
