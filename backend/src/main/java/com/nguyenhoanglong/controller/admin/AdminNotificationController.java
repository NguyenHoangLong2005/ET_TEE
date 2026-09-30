package com.nguyenhoanglong.controller.admin;

import com.nguyenhoanglong.constant.PermissionConstants;
import com.nguyenhoanglong.entity.SystemNotification;
import com.nguyenhoanglong.repository.SystemNotificationRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/notifications")
@PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_MAILING)")
public class AdminNotificationController {

    private final SystemNotificationRepository notificationRepository;

    public AdminNotificationController(SystemNotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @PostConstruct
    public void initDefaultNotifications() {
        try {
            if (notificationRepository.count() == 0) {
                SystemNotification n1 = new SystemNotification();
                n1.setType("BACKUP_SUCCESS");
                n1.setTitle("Sao lưu cơ sở dữ liệu hoàn tất");
                n1.setMessage("Bản sao lưu snapshot định kỳ ettee_backup_latest.sql đã được tạo thành công.");
                n1.setSeverity("SUCCESS");
                n1.setTargetUrl("/admin/backup");
                n1.setCreatedAt(LocalDateTime.now().minusHours(2));
                notificationRepository.save(n1);

                SystemNotification n2 = new SystemNotification();
                n2.setType("AUDIT_ALERT");
                n2.setTitle("Cảnh báo bảo mật: Nhiều lượt đăng nhập bất thường");
                n2.setMessage("Phát hiện 5 lượt đăng nhập sai mật khẩu liên tiếp từ IP 118.69.182.42 vào tài khoản admin.");
                n2.setSeverity("DANGER");
                n2.setTargetUrl("/admin/audit-logs");
                n2.setCreatedAt(LocalDateTime.now().minusHours(5));
                notificationRepository.save(n2);

                SystemNotification n3 = new SystemNotification();
                n3.setType("AI_FEATURE_CHANGED");
                n3.setTitle("Thay đổi AI Feature Flag: smart_search");
                n3.setMessage("Tính năng tìm kiếm thông minh bằng Vector Search đã được kích hoạt trên toàn hệ thống.");
                n3.setSeverity("INFO");
                n3.setTargetUrl("/admin/ai-feature-flags");
                n3.setCreatedAt(LocalDateTime.now().minusHours(12));
                notificationRepository.save(n3);

                SystemNotification n4 = new SystemNotification();
                n4.setType("SYSTEM_ERROR");
                n4.setTitle("Cảnh báo bộ nhớ JVM");
                n4.setMessage("Mức tiêu thụ bộ nhớ Heap JVM đạt 78% dung lượng cấp phát. Hệ thống đã kích hoạt Garbage Collection.");
                n4.setSeverity("WARNING");
                n4.setTargetUrl("/admin/monitoring");
                n4.setCreatedAt(LocalDateTime.now().minusDays(1));
                notificationRepository.save(n4);
            }
        } catch (Exception e) {
            // Log or ignore on startup if table creation delayed
            System.err.println("Notice: Could not seed notifications on startup: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<?> getNotifications() {
        List<SystemNotification> list = notificationRepository.findTop20ByOrderByCreatedAtDesc();
        long unreadCount = notificationRepository.countByIsReadFalse();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("notifications", list);
        response.put("unreadCount", unreadCount);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        return notificationRepository.findById(id).map(notif -> {
            notif.setRead(true);
            notif.setReadAt(LocalDateTime.now());
            notificationRepository.save(notif);
            return ResponseEntity.ok(Map.of("message", "Đã đánh dấu đã đọc", "id", id));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<?> markAllAsRead() {
        notificationRepository.markAllAsRead(LocalDateTime.now());
        return ResponseEntity.ok(Map.of("message", "Đã đánh dấu tất cả thông báo là đã đọc"));
    }

    @PostMapping
    public ResponseEntity<?> createNotification(@RequestBody Map<String, String> payload) {
        SystemNotification notif = new SystemNotification();
        notif.setType(payload.getOrDefault("type", "SYSTEM_ALERT"));
        notif.setTitle(payload.getOrDefault("title", "Thông báo hệ thống"));
        notif.setMessage(payload.getOrDefault("message", ""));
        notif.setSeverity(payload.getOrDefault("severity", "INFO"));
        notif.setTargetUrl(payload.getOrDefault("targetUrl", "/admin/dashboard"));
        notif.setCreatedAt(LocalDateTime.now());
        SystemNotification saved = notificationRepository.save(notif);
        return ResponseEntity.ok(saved);
    }
}
