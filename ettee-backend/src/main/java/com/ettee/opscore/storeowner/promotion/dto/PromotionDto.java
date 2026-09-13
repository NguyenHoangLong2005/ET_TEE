package com.ettee.opscore.storeowner.promotion.dto;

import com.ettee.opscore.storeowner.promotion.entity.DiscountType;
import com.ettee.opscore.storeowner.promotion.entity.PromotionStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PromotionDto(
        UUID id, String code, String name, String description, DiscountType discountType,
        BigDecimal discountValue, BigDecimal maxDiscountAmount, BigDecimal minOrderValue,
        Instant startAt, Instant endAt, PromotionStatus status, UUID approvedBy, Instant approvedAt
) {
}
