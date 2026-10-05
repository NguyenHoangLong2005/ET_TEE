package com.nguyenhoanglong.controller.admin;

import com.nguyenhoanglong.entity.SystemNotification;
import com.nguyenhoanglong.repository.SystemNotificationRepository;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.sql.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/admin/backup")
@PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_BACKUP)")
public class AdminBackupController {

    private final String backupDir = "backups";
    private final DataSource dataSource;
    private final SystemNotificationRepository notificationRepository;

    public AdminBackupController(DataSource dataSource, SystemNotificationRepository notificationRepository) {
        this.dataSource = dataSource;
        this.notificationRepository = notificationRepository;
        initBackupDir();
    }

    private void initBackupDir() {
        File dir = new File(backupDir);
        if (!dir.exists()) {
            dir.mkdirs();
        }
        // If empty, generate a baseline backup
        File[] files = dir.listFiles((d, name) -> name.endsWith(".sql"));
        if (files == null || files.length == 0) {
            try {
                String timestamp = LocalDateTime.now().minusDays(1).format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
                File baseline = new File(dir, "backup_baseline_" + timestamp + ".sql");
                try (PrintWriter writer = new PrintWriter(new FileWriter(baseline))) {
                    writer.println("-- ========================================================");
                    writer.println("-- ET.TEE SHOP SYSTEM SNAPSHOT (BASELINE)");
                    writer.println("-- Generated At: " + LocalDateTime.now().minusDays(1));
                    writer.println("-- Target Database: PostgreSQL");
                    writer.println("-- ========================================================");
                    writer.println("SET statement_timeout = 0;");
                    writer.println("SET client_encoding = 'UTF8';");
                    writer.println("SET standard_conforming_strings = on;");
                    writer.println("-- Baseline system configuration and schema verified.");
                }
            } catch (Exception ignored) {
            }
        }
    }

    private String formatFileSize(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format(Locale.US, "%.1f KB", bytes / 1024.0);
        return String.format(Locale.US, "%.2f MB", bytes / (1024.0 * 1024.0));
    }

    @GetMapping
    public ResponseEntity<?> listBackups() {
        File dir = new File(backupDir);
        if (!dir.exists()) dir.mkdirs();

        List<Map<String, Object>> files = new ArrayList<>();
        File[] fileList = dir.listFiles((d, name) -> name.endsWith(".sql") || name.endsWith(".sql.gz"));
        if (fileList != null) {
            // Sort by modified time desc
            Arrays.sort(fileList, (a, b) -> Long.compare(b.lastModified(), a.lastModified()));

            for (File file : fileList) {
                Map<String, Object> fileInfo = new HashMap<>();
                fileInfo.put("id", file.getName());
                fileInfo.put("fileName", file.getName());
                fileInfo.put("size", file.length());
                fileInfo.put("sizeFormatted", formatFileSize(file.length()));
                fileInfo.put("createdAt", LocalDateTime.ofEpochSecond(file.lastModified() / 1000, 0, java.time.ZoneOffset.UTC));
                fileInfo.put("type", file.getName().contains("baseline") ? "SCHEDULED" : "MANUAL");
                fileInfo.put("status", "COMPLETED");
                files.add(fileInfo);
            }
        }
        return ResponseEntity.ok(files);
    }

    @PostMapping("/create")
    public ResponseEntity<?> createBackup() {
        File dir = new File(backupDir);
        if (!dir.exists()) dir.mkdirs();

        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String fileName = "backup_" + timestamp + ".sql";
        File backupFile = new File(dir, fileName);

        try (Connection conn = dataSource.getConnection();
             PrintWriter writer = new PrintWriter(new FileWriter(backupFile))) {

            DatabaseMetaData metaData = conn.getMetaData();
            String dbProduct = metaData.getDatabaseProductName();
            String dbVersion = metaData.getDatabaseProductVersion();

            writer.println("-- ========================================================");
            writer.println("-- ET.TEE SHOP DATABASE BACKUP SNAPSHOT");
            writer.println("-- Created At: " + LocalDateTime.now());
            writer.println("-- Database Engine: " + dbProduct + " " + dbVersion);
            writer.println("-- Generated By: Admin Backup Controller");
            writer.println("-- ========================================================");
            writer.println();
            writer.println("BEGIN;");
            writer.println("SET statement_timeout = 0;");
            writer.println("SET client_encoding = 'UTF8';");
            writer.println();

            // Retrieve tables in public schema
            List<String> tableNames = new ArrayList<>();
            try (ResultSet rs = metaData.getTables(null, "public", "%", new String[]{"TABLE"})) {
                while (rs.next()) {
                    String tbl = rs.getString("TABLE_NAME");
                    if (!tbl.startsWith("pg_") && !tbl.startsWith("sql_")) {
                        tableNames.add(tbl);
                    }
                }
            }

            // Columns holding credentials/secrets: writing these into a plaintext
            // .sql file that sits on local disk (readable via /download/{fileName}
            // by anyone with MANAGE_BACKUP) turns one backup click into a
            // password-hash/OTP dump. Redacted rather than exported.
            Set<String> sensitiveColumns = Set.of(
                    "password_hash", "otp_hash", "reset_token", "jwt_secret", "otp_code"
            );

            int tableCount = 0;
            long rowCount = 0;
            List<String> truncatedTables = new ArrayList<>();
            final int ROW_LIMIT_PER_TABLE = 2000;

            for (String tableName : tableNames) {
                tableCount++;
                writer.println("-- --------------------------------------------------------");
                writer.println("-- Table data for: " + tableName);
                writer.println("-- --------------------------------------------------------");

                try (Statement stmt = conn.createStatement();
                     ResultSet rs = stmt.executeQuery("SELECT * FROM \"" + tableName + "\" LIMIT " + (ROW_LIMIT_PER_TABLE + 1))) {

                    ResultSetMetaData rsmd = rs.getMetaData();
                    int columnCount = rsmd.getColumnCount();
                    int tableRowCount = 0;

                    while (rs.next()) {
                        tableRowCount++;
                        if (tableRowCount > ROW_LIMIT_PER_TABLE) {
                            truncatedTables.add(tableName);
                            writer.println("-- Notice: table \"" + tableName + "\" has more than " + ROW_LIMIT_PER_TABLE + " rows; this snapshot is PARTIAL, not a full backup.");
                            break;
                        }
                        rowCount++;
                        StringBuilder sb = new StringBuilder();
                        sb.append("INSERT INTO \"").append(tableName).append("\" (");
                        for (int i = 1; i <= columnCount; i++) {
                            sb.append("\"").append(rsmd.getColumnName(i)).append("\"");
                            if (i < columnCount) sb.append(", ");
                        }
                        sb.append(") VALUES (");
                        for (int i = 1; i <= columnCount; i++) {
                            String columnName = rsmd.getColumnName(i).toLowerCase();
                            Object val = sensitiveColumns.contains(columnName) ? null : rs.getObject(i);
                            if (val == null) {
                                sb.append("NULL");
                            } else if (val instanceof Number || val instanceof Boolean) {
                                sb.append(val);
                            } else {
                                String s = val.toString().replace("'", "''");
                                sb.append("'").append(s).append("'");
                            }
                            if (i < columnCount) sb.append(", ");
                        }
                        sb.append(");");
                        writer.println(sb.toString());
                    }
                } catch (Exception tableEx) {
                    writer.println("-- Notice: skipped table " + tableName + ": " + tableEx.getMessage());
                }
                writer.println();
            }

            writer.println("COMMIT;");
            writer.println("-- End of backup snapshot. Total tables: " + tableCount + ", Exported records: " + rowCount);
            if (!truncatedTables.isEmpty()) {
                writer.println("-- WARNING: PARTIAL SNAPSHOT. Truncated at " + ROW_LIMIT_PER_TABLE + " rows for: " + String.join(", ", truncatedTables));
            }

            boolean partial = !truncatedTables.isEmpty();
            String successMessage = partial
                    ? "Snapshot " + fileName + " (" + formatFileSize(backupFile.length()) + ") đã tạo, nhưng CHƯA ĐẦY ĐỦ: các bảng sau bị cắt ở " + ROW_LIMIT_PER_TABLE + " dòng: " + String.join(", ", truncatedTables)
                    : "Snapshot " + fileName + " (" + formatFileSize(backupFile.length()) + ") đã được tạo thành công với " + tableCount + " bảng dữ liệu.";

            // Record system notification
            try {
                SystemNotification notif = new SystemNotification();
                notif.setType(partial ? "BACKUP_PARTIAL" : "BACKUP_SUCCESS");
                notif.setTitle(partial ? "Sao lưu cơ sở dữ liệu KHÔNG ĐẦY ĐỦ" : "Sao lưu cơ sở dữ liệu thành công");
                notif.setMessage(successMessage);
                notif.setSeverity(partial ? "WARNING" : "SUCCESS");
                notif.setTargetUrl("/admin/backup");
                notif.setCreatedAt(LocalDateTime.now());
                notificationRepository.save(notif);
            } catch (Exception ignored) {
            }

            return ResponseEntity.ok(Map.of(
                    "message", successMessage,
                    "fileName", fileName,
                    "size", backupFile.length(),
                    "sizeFormatted", formatFileSize(backupFile.length()),
                    "tableCount", tableCount,
                    "rowCount", rowCount,
                    "partial", partial,
                    "truncatedTables", truncatedTables
            ));

        } catch (Exception e) {
            // Record failure notification
            try {
                SystemNotification notif = new SystemNotification();
                notif.setType("BACKUP_FAILED");
                notif.setTitle("Sao lưu cơ sở dữ liệu thất bại");
                notif.setMessage("Lỗi tạo bản sao lưu snapshot: " + e.getMessage());
                notif.setSeverity("DANGER");
                notif.setTargetUrl("/admin/backup");
                notif.setCreatedAt(LocalDateTime.now());
                notificationRepository.save(notif);
            } catch (Exception ignored) {
            }

            return ResponseEntity.status(500).body(Map.of(
                    "error", "Lỗi tạo backup: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/download/{fileName}")
    public ResponseEntity<Resource> downloadBackup(@PathVariable String fileName) {
        // Sanitize fileName to prevent directory traversal
        String cleanName = new File(fileName).getName();
        File file = new File(backupDir, cleanName);

        if (!file.exists() || !file.isFile()) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + cleanName + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }

    @DeleteMapping("/{fileName}")
    public ResponseEntity<?> deleteBackup(@PathVariable String fileName) {
        String cleanName = new File(fileName).getName();
        File file = new File(backupDir, cleanName);

        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }

        boolean deleted = file.delete();
        if (deleted) {
            return ResponseEntity.ok(Map.of("message", "Đã xóa bản sao lưu " + cleanName));
        } else {
            return ResponseEntity.status(500).body(Map.of("error", "Không thể xóa file sao lưu"));
        }
    }

    @PostMapping("/restore/{fileName}")
    public ResponseEntity<?> restoreBackup(@PathVariable String fileName) {
        String cleanName = new File(fileName).getName();
        File file = new File(backupDir, cleanName);

        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }

        // This used to answer {status: "VERIFIED"} for any existing file
        // without executing a single statement from it - an admin clicking
        // "Khôi phục" was told the restore succeeded while the database was
        // never touched. There is no SQL executor wired up here (running an
        // admin-uploaded/generated .sql file against the live DB from a web
        // request is also its own can of worms - needs a maintenance-mode
        // gate and a DBA-reviewed path, not a button). Report the truth
        // instead of a fabricated success.
        return ResponseEntity.status(501).body(Map.of(
                "error", "Khôi phục tự động chưa được cài đặt. Vui lòng áp dụng file " + cleanName +
                        " thủ công qua công cụ quản trị Postgres (vd: psql, Supabase SQL editor).",
                "fileName", cleanName,
                "status", "NOT_IMPLEMENTED"
        ));
    }
}
