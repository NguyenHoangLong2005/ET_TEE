package com.nguyenhoanglong.controller.admin;

import com.nguyenhoanglong.entity.ActivityLog;
import com.nguyenhoanglong.entity.Order;
import com.nguyenhoanglong.entity.OrderStatus;
import com.nguyenhoanglong.repository.ActivityLogRepository;
import com.nguyenhoanglong.repository.OrderRepository;
import com.nguyenhoanglong.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;

import javax.sql.DataSource;
import java.lang.management.ManagementFactory;
import java.lang.management.OperatingSystemMXBean;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/monitoring")
public class AdminMonitoringController {

    @Autowired
    private DataSource dataSource;
    
    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ActivityLogRepository activityLogRepository;
    
    @GetMapping({"", "/metrics"})
    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).VIEW_SYS_ERROR_LOG)")
    public ResponseEntity<?> getMetrics() {
        // JVM metrics
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;

        OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
        double systemLoad = osBean.getSystemLoadAverage();

        // Application metrics
        long startTime = ManagementFactory.getRuntimeMXBean().getStartTime();
        long uptime = ManagementFactory.getRuntimeMXBean().getUptime();
        int threadCount = ManagementFactory.getThreadMXBean().getThreadCount();
        int peakThreadCount = ManagementFactory.getThreadMXBean().getPeakThreadCount();

        // Database pool metrics
        Map<String, Object> dbPool = new LinkedHashMap<>();
        try {
            dbPool.put("engine", "PostgreSQL 16");
            if (dataSource instanceof HikariDataSource hikari) {
                HikariPoolMXBean poolMXBean = hikari.getHikariPoolMXBean();
                dbPool.put("activeConnections", poolMXBean.getActiveConnections());
                dbPool.put("idleConnections", poolMXBean.getIdleConnections());
                dbPool.put("totalConnections", poolMXBean.getTotalConnections());
                dbPool.put("threadsAwaitingConnection", poolMXBean.getThreadsAwaitingConnection());
                dbPool.put("maxPoolSize", hikari.getMaximumPoolSize());
                dbPool.put("minIdle", hikari.getMinimumIdle());
            }
        } catch (Exception e) {
            dbPool.put("error", "Unable to get pool metrics");
        }

        // Order statistics
        Map<String, Long> orderStats = new LinkedHashMap<>();
        // COUNT(*) o tang DB. Truoc day cac dong nay load toan bo entity Order ve JVM
        // chi de goi .count() tren stream.
        long totalOrders = orderRepository.count();
        long pendingOrders = orderRepository.countByStatusIn(
            java.util.List.of(OrderStatus.PENDING_CONFIRMATION, OrderStatus.PENDING_PAYMENT)
        );
        long activeOrders = orderRepository.countByStatusIn(
            java.util.List.of(OrderStatus.CONFIRMED, OrderStatus.PICKING, OrderStatus.PACKED, OrderStatus.SHIPPING)
        );

        orderStats.put("totalOrders", totalOrders);
        orderStats.put("pendingOrders", pendingOrders);
        orderStats.put("activeOrders", activeOrders);

        // Recent errors (from activity logs)
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        long recentErrors = activityLogRepository.countErrorsSince(oneHourAgo);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("jvm", Map.of(
            "usedMemoryMb", usedMemory / (1024 * 1024),
            "totalMemoryMb", totalMemory / (1024 * 1024),
            "freeMemoryMb", freeMemory / (1024 * 1024),
            "maxMemoryMb", runtime.maxMemory() / (1024 * 1024),
            "systemLoad", systemLoad,
            "processors", osBean.getAvailableProcessors(),
            "threadCount", threadCount,
            "peakThreadCount", peakThreadCount
        ));
        response.put("database", dbPool);
        response.put("orders", orderStats);
        response.put("recentErrors", recentErrors);
        response.put("uptime", Map.of(
            "startTime", startTime,
            "uptimeMs", uptime,
            "uptimeFormatted", formatUptime(uptime)
        ));

        return ResponseEntity.ok(response);
    }
    
    private String formatUptime(long uptimeMs) {
        long seconds = uptimeMs / 1000;
        long minutes = seconds / 60;
        long hours = minutes / 60;
        long days = hours / 24;
        
        if (days > 0) {
            return String.format("%dd %dh %dm", days, hours % 24, minutes % 60);
        } else if (hours > 0) {
            return String.format("%dh %dm %ds", hours, minutes % 60, seconds % 60);
        } else if (minutes > 0) {
            return String.format("%dm %ds", minutes, seconds % 60);
        } else {
            return String.format("%ds", seconds);
        }
    }
}
