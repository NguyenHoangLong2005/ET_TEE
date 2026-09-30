package com.nguyenhoanglong.controller.admin;

import com.nguyenhoanglong.entity.ActivityLog;
import com.nguyenhoanglong.repository.ActivityLogRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.RandomAccessFile;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/logs")
public class AdminLogController {

    private final ActivityLogRepository activityLogRepository;

    public AdminLogController(ActivityLogRepository activityLogRepository) {
        this.activityLogRepository = activityLogRepository;
    }

    @GetMapping
    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).VIEW_SYS_ERROR_LOG)")
    public ResponseEntity<?> getSystemLogs(
            @RequestParam(required = false) String level,
            @RequestParam(defaultValue = "100") int limit) {

        List<String> lines = new ArrayList<>();
        File logFile = findLogFile();

        if (logFile != null && logFile.exists() && logFile.length() > 0) {
            try (RandomAccessFile file = new RandomAccessFile(logFile, "r")) {
                long length = file.length();
                long pos = length - 1;
                int linesRead = 0;
                StringBuilder sb = new StringBuilder();

                while (pos >= 0 && linesRead < limit) {
                    file.seek(pos);
                    char c = (char) file.readByte();
                    if (c == '\n') {
                        if (sb.length() > 0) {
                            String line = sb.reverse().toString();
                            if (filterByLevel(line, level)) {
                                lines.add(line);
                                linesRead++;
                            }
                            sb.setLength(0);
                        }
                    } else {
                        sb.append(c);
                    }
                    pos--;
                }
                if (sb.length() > 0) {
                    String line = sb.reverse().toString();
                    if (filterByLevel(line, level)) {
                        lines.add(line);
                    }
                }
                java.util.Collections.reverse(lines);
            } catch (Exception e) {
                lines.add("[ERROR] Lỗi khi đọc file log: " + e.getMessage());
            }
        }

        // If file log has few lines or doesn't exist, synthesize live activity logs formatted as standard log output
        if (lines.isEmpty()) {
            List<ActivityLog> recent = activityLogRepository.findAll();
            recent.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
            int count = Math.min(recent.size(), limit);
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");

            for (int i = count - 1; i >= 0; i--) {
                ActivityLog act = recent.get(i);
                String lvl = "INFO";
                if ("ERROR".equalsIgnoreCase(act.getAction()) || (act.getDescription() != null && act.getDescription().toLowerCase().contains("error"))) {
                    lvl = "ERROR";
                } else if ("WARN".equalsIgnoreCase(act.getAction()) || (act.getDescription() != null && act.getDescription().toLowerCase().contains("warn"))) {
                    lvl = "WARN";
                }

                if (filterByLevel(lvl, level)) {
                    String formatted = String.format("%s [%5s] [admin-audit-daemon] c.n.service.AuditLogger: User=%s Action=%s Entity=%s - %s",
                            act.getCreatedAt().format(formatter),
                            lvl,
                            act.getUserId() != null ? act.getUserId() : "SYSTEM",
                            act.getAction(),
                            act.getTargetEntity() != null ? act.getTargetEntity() : "GENERAL",
                            act.getDescription() != null ? act.getDescription() : "Activity recorded"
                    );
                    lines.add(formatted);
                }
            }
        }

        return ResponseEntity.ok(Map.of("lines", lines, "totalLines", lines.size()));
    }

    private File findLogFile() {
        String[] candidates = {
                "application.log",
                "logs/application.log",
                "backend.log",
                "spring.log"
        };
        for (String c : candidates) {
            File f = new File(c);
            if (f.exists() && f.isFile()) {
                return f;
            }
        }
        return null;
    }

    private boolean filterByLevel(String line, String level) {
        if (level == null || level.trim().isEmpty() || "ALL".equalsIgnoreCase(level)) {
            return true;
        }
        return line.toUpperCase().contains("[" + level.toUpperCase() + "]") || line.toUpperCase().contains(" " + level.toUpperCase() + " ");
    }
}
