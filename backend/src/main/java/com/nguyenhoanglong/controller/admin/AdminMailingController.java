package com.nguyenhoanglong.controller.admin;

import com.nguyenhoanglong.entity.EmailLog;
import com.nguyenhoanglong.repository.EmailLogRepository;
import com.nguyenhoanglong.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
public class AdminMailingController {

    private final EmailLogRepository emailLogRepository;
    private final EmailService emailService;

    public AdminMailingController(EmailLogRepository emailLogRepository, EmailService emailService) {
        this.emailLogRepository = emailLogRepository;
        this.emailService = emailService;
    }

    @GetMapping({"/mailing/logs", "/email-logs"})
    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_MAILING)")
    public ResponseEntity<?> getEmailLogs(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        
        // Loc + sap xep + phan trang o tang DB thay vi findAll() roi subList trong JVM.
        String keyword = (search != null && !search.trim().isEmpty())
                ? "%" + search.trim().toLowerCase() + "%"
                : "%";
        String statusFilter = (status != null && !status.trim().isEmpty() && !"ALL".equalsIgnoreCase(status))
                ? status.trim().toUpperCase()
                : "%";
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<EmailLog> logPage = emailLogRepository.searchLogs(keyword, statusFilter, pageable);

        List<EmailLog> pagedList = logPage.getContent();
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

    @PostMapping({"/mailing/logs/{id}/retry", "/email-logs/{id}/retry"})
    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_MAILING)")
    public ResponseEntity<?> retryEmail(@PathVariable Long id) {
        Optional<EmailLog> logOpt = emailLogRepository.findById(id);
        if (logOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        EmailLog log = logOpt.get();
        try {
            // Attempt resend
            emailService.sendVerificationEmail(log.getRecipient(), "RETRY-OTP");
            log.setStatus("SENT");
            log.setErrorMessage(null);
            emailLogRepository.save(log);
            return ResponseEntity.ok(Map.of("message", "Thử lại gửi email thành công"));
        } catch (Exception e) {
            log.setStatus("FAILED");
            log.setErrorMessage(e.getMessage());
            emailLogRepository.save(log);
            return ResponseEntity.badRequest().body(Map.of("error", "Gửi lại thất bại: " + e.getMessage()));
        }
    }
}
