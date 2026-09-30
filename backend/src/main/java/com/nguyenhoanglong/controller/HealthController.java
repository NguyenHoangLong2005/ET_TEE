package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/health")
    public Map<String, Object> simpleHealth() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("timestamp", LocalDateTime.now());
        health.put("application", "ET.TEE Fashion Recommendation System");
        health.put("version", "1.0.0");
        return health;
    }

    @GetMapping("/api/health")
    public ResponseEntity<ApiResponse<Map<String, String>>> checkHealth() {

        Map<String, String> data = new LinkedHashMap<>();
        data.put("status", "UP");
        return ResponseEntity.ok(ApiResponse.success("Fashion Backend is running", data));
    }

    @GetMapping("/database")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkDatabaseHealth() {
        Map<String, Object> data = new LinkedHashMap<>();
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metaData = connection.getMetaData();
            data.put("status", "UP");
            data.put("databaseProduct", metaData.getDatabaseProductName());
            data.put("databaseVersion", metaData.getDatabaseProductVersion());
            return ResponseEntity.ok(ApiResponse.success("Database connection is healthy", data));
        } catch (Exception e) {
            data.put("status", "DOWN");
            data.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ApiResponse.error("Failed to connect to PostgreSQL database: " + e.getMessage(), data));
        }
    }
}
