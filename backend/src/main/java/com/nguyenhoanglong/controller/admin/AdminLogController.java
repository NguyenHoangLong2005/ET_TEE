package com.nguyenhoanglong.controller.admin;

import com.nguyenhoanglong.entity.ActivityLog;
import com.nguyenhoanglong.repository.ActivityLogRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/logs")
public class AdminLogController {

    private static final int MAX_LINES = 2000;
    /** How much of the end of the log file is scanned; enough for thousands of lines, bounded in memory. */
    private static final long TAIL_BYTES = 4L * 1024 * 1024;

    private final ActivityLogRepository activityLogRepository;

    /** Same value the logging system writes to (logging.file.name), so the viewer reads the file being written. */
    @org.springframework.beans.factory.annotation.Value("${logging.file.name:}")
    private String configuredLogFile;

    public AdminLogController(ActivityLogRepository activityLogRepository) {
        this.activityLogRepository = activityLogRepository;
    }

    @GetMapping
    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).VIEW_SYS_ERROR_LOG)")
    public ResponseEntity<?> getSystemLogs(
            @RequestParam(required = false) String level,
            @RequestParam(defaultValue = "100") int limit) {

        int safeLimit = Math.min(Math.max(limit, 1), MAX_LINES);
        List<String> lines = new ArrayList<>();
        String source = "AUDIT";
        String fileName = null;

        File logFile = findLogFile();
        if (logFile != null && logFile.length() > 0) {
            try {
                lines = readTail(logFile, level, safeLimit);
                source = "FILE";
                fileName = logFile.getName();
            } catch (Exception e) {
                lines = new ArrayList<>();
                lines.add("[ERROR] Lỗi khi đọc file log: " + e.getMessage());
                source = "FILE";
                fileName = logFile.getName();
            }
        }

        // No log file is configured/written: fall back to recent audit activity, formatted like
        // log lines. The response says so (source=AUDIT) so the UI never passes it off as the
        // real application log.
        if (lines.isEmpty() && !"FILE".equals(source)) {
            lines = recentActivityAsLines(level, safeLimit);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("lines", lines);
        body.put("totalLines", lines.size());
        body.put("source", source);
        body.put("file", fileName);
        return ResponseEntity.ok(body);
    }

    /** Last {@code limit} matching lines, decoded as UTF-8 (byte-wise reading garbled Vietnamese text). */
    private List<String> readTail(File file, String level, int limit) throws IOException {
        try (RandomAccessFile raf = new RandomAccessFile(file, "r")) {
            long length = raf.length();
            long chunk = Math.min(length, TAIL_BYTES);
            long start = length - chunk;
            byte[] buffer = new byte[(int) chunk];
            raf.seek(start);
            raf.readFully(buffer);

            List<String> all = new ArrayList<>(Arrays.asList(new String(buffer, StandardCharsets.UTF_8).split("\\R")));
            if (start > 0 && !all.isEmpty()) all.remove(0); // first line is cut in the middle

            List<String> matched = new ArrayList<>();
            for (String line : all) {
                if (!line.isBlank() && filterByLevel(line, level)) matched.add(line);
            }
            int from = Math.max(0, matched.size() - limit);
            return new ArrayList<>(matched.subList(from, matched.size()));
        }
    }

    private List<String> recentActivityAsLines(String level, int limit) {
        // A page from the DB instead of findAll(): the audit table grows with every admin action.
        List<ActivityLog> recent = activityLogRepository
                .findAll(PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt"))).getContent();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");

        List<String> lines = new ArrayList<>();
        for (int i = recent.size() - 1; i >= 0; i--) { // oldest first, like a log
            ActivityLog act = recent.get(i);
            String lvl = levelOf(act);
            if (!filterByLevel(lvl, level)) continue;
            lines.add(String.format("%s [%5s] [audit] User=%s Action=%s Entity=%s%s - %s",
                    act.getCreatedAt() != null ? act.getCreatedAt().format(formatter) : "----------- --:--:--.---",
                    lvl,
                    act.getActorEmail() != null ? act.getActorEmail() : (act.getUserId() != null ? act.getUserId() : "SYSTEM"),
                    act.getAction(),
                    act.getTargetEntity() != null ? act.getTargetEntity() : "GENERAL",
                    act.getIpAddress() != null ? " IP=" + act.getIpAddress() : "",
                    act.getDescription() != null ? act.getDescription() : "Activity recorded"));
        }
        return lines;
    }

    private String levelOf(ActivityLog act) {
        String action = act.getAction() == null ? "" : act.getAction().toUpperCase();
        String description = act.getDescription() == null ? "" : act.getDescription().toLowerCase();
        Integer status = act.getStatusCode();
        if ("ERROR".equals(action) || description.contains("error") || (status != null && status >= 500)) return "ERROR";
        if ("WARN".equals(action) || description.contains("warn") || "FAILURE".equals(act.getResult())
                || "LOGIN_FAILED".equals(action) || "ACCESS_DENIED".equals(action)) return "WARN";
        return "INFO";
    }

    private File findLogFile() {
        String[] candidates = {
                configuredLogFile == null ? "" : configuredLogFile,
                "application.log",
                "logs/application.log",
                "backend.log",
                "spring.log"
        };
        for (String c : candidates) {
            if (c == null || c.isBlank()) continue;
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
        String upper = line.toUpperCase();
        String lvl = level.toUpperCase();
        return upper.contains("[" + lvl + "]") || upper.contains(" " + lvl + " ");
    }
}
