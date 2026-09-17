package com.ettee.opscore.storeowner.dashboard.dto;

import java.math.BigDecimal;
import java.util.Map;

public record DashboardSummaryDto(
        BigDecimal revenue,
        long totalOrders,
        long cancelledOrders,
        long returnedOrders,
        double cancelRate,
        double returnRate,
        long lowStockVariantCount,
        Map<String, Long> ordersByStatus
) {
}
