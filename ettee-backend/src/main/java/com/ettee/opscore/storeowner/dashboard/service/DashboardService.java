package com.ettee.opscore.storeowner.dashboard.service;

import com.ettee.opscore.order.entity.OrderStatus;
import com.ettee.opscore.order.repository.OrderRepository;
import com.ettee.opscore.storeowner.dashboard.dto.DashboardSummaryDto;
import com.ettee.opscore.storeowner.inventory.repository.InventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final OrderRepository orderRepository;
    private final InventoryRepository inventoryRepository;

    @Transactional(readOnly = true)
    public DashboardSummaryDto summary(LocalDate from, LocalDate to) {
        LocalDate effectiveFrom = from != null ? from : LocalDate.now().minusDays(30);
        LocalDate effectiveTo = to != null ? to : LocalDate.now();
        Instant fromInstant = effectiveFrom.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant toInstant = effectiveTo.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

        BigDecimal revenue = orderRepository.sumRevenue(fromInstant, toInstant);
        long total = orderRepository.countOrders(fromInstant, toInstant);
        long cancelled = orderRepository.countCancelled(fromInstant, toInstant);
        long returned = orderRepository.countReturned(fromInstant, toInstant);

        double cancelRate = total == 0 ? 0 : round2((double) cancelled / total * 100);
        double returnRate = total == 0 ? 0 : round2((double) returned / total * 100);

        long lowStock = inventoryRepository.findLowStock(PageRequest.of(0, 1)).getTotalElements();

        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (OrderStatus s : OrderStatus.values()) byStatus.put(s.name(), 0L);
        for (Object[] row : orderRepository.countByStatus(fromInstant, toInstant)) {
            OrderStatus status = (OrderStatus) row[0];
            Long count = (Long) row[1];
            byStatus.put(status.name(), count);
        }

        return new DashboardSummaryDto(revenue, total, cancelled, returned, cancelRate, returnRate, lowStock, byStatus);
    }

    private double round2(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
