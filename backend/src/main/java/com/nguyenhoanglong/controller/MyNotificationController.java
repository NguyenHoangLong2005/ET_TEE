package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.entity.SystemNotification;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.SystemNotificationRepository;
import com.nguyenhoanglong.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Chuông thông báo cá nhân cho mọi role (nhân viên, chủ cửa hàng...). */
@RestController
@RequestMapping("/api/notifications/me")
public class MyNotificationController {

    private final SystemNotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public MyNotificationController(SystemNotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    private Optional<String> currentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return Optional.empty();
        return userRepository.findByEmail(auth.getName()).map(User::getId);
    }

    @GetMapping
    public ResponseEntity<?> list() {
        Optional<String> userId = currentUserId();
        List<SystemNotification> list = userId
                .map(notificationRepository::findTop20ByRecipientUserIdOrderByCreatedAtDesc)
                .orElse(List.of());
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("notifications", list);
        response.put("unreadCount", userId.map(notificationRepository::countByRecipientUserIdAndIsReadFalse).orElse(0L));
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        Optional<String> userId = currentUserId();
        return notificationRepository.findById(id)
                .filter(n -> userId.isPresent() && userId.get().equals(n.getRecipientUserId()))
                .map(n -> {
                    n.setRead(true);
                    n.setReadAt(LocalDateTime.now());
                    notificationRepository.save(n);
                    return ResponseEntity.ok(Map.of("message", "Đã đánh dấu đã đọc", "id", id));
                }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<?> markAllAsRead() {
        currentUserId().ifPresent(id -> notificationRepository.markAllAsReadForUser(id, LocalDateTime.now()));
        return ResponseEntity.ok(Map.of("message", "Đã đánh dấu tất cả thông báo là đã đọc"));
    }
}
