package com.nguyenhoanglong.controller.admin;

import com.nguyenhoanglong.dto.ApiResponse;
import com.nguyenhoanglong.service.DataAuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/products")
public class AdminProductController {

    private final DataAuditService dataAuditService;

    public AdminProductController(DataAuditService dataAuditService) {
        this.dataAuditService = dataAuditService;
    }

    @org.springframework.beans.factory.annotation.Value("${app.product.audit.enabled:false}")
    private boolean auditEnabled;

    @PostMapping("/audit")
    public ResponseEntity<ApiResponse<Map<String, Object>>> runAudit() {
        if (!auditEnabled) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Audit endpoint is disabled");
        }
        Map<String, Object> report = dataAuditService.runProductAudit();
        return ResponseEntity.ok(ApiResponse.success("Product data audit completed.", report));
    }
}
