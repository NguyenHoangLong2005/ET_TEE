package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping
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
