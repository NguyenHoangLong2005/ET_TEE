package com.nguyenhoanglong.controller.admin;

import com.nguyenhoanglong.entity.ActivityLog;
import com.nguyenhoanglong.repository.ActivityLogRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/audit-logs")
public class AdminAuditLogController {

    private final ActivityLogRepository auditLogRepository;

    public AdminAuditLogController(ActivityLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).VIEW_AUDIT_LOG)")
    public ResponseEntity<?> getAuditLogs(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        
        // Loc + sap xep + phan trang o tang DB. Truoc day controller goi findAll() keo
        // toan bo bang activity_logs ve JVM roi subList.
        String keyword = (search != null && !search.trim().isEmpty())
                ? "%" + search.trim().toLowerCase() + "%"
                : "%";
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<ActivityLog> logPage = auditLogRepository.searchLogs(keyword, pageable);

        List<ActivityLog> pagedList = logPage.getContent();
        long totalElements = logPage.getTotalElements();
        int totalPages = logPage.getTotalPages();

        return ResponseEntity.ok(Map.of(
                "content", pagedList,
                "totalElements", totalElements,
                "totalPages", totalPages,
                "number", page,
                "size", size
        ));
    }
}
