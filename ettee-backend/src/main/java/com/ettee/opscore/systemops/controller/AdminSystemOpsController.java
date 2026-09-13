package com.ettee.opscore.systemops.controller;

import com.ettee.opscore.common.dto.ApiResponse;
import com.ettee.opscore.common.dto.PageResponse;
import com.ettee.opscore.security.JwtPrincipal;
import com.ettee.opscore.systemops.dto.*;
import com.ettee.opscore.systemops.service.SystemOpsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminSystemOpsController {

    private final SystemOpsService systemOpsService;

    /** Nghiệp vụ "Nhật ký hệ thống (Logs)" — permission audit.all. */
    @GetMapping("/audit-logs")
    @PreAuthorize("hasAuthority('audit.all')")
    public ApiResponse<PageResponse<AuditLogDto>> auditLogs(
            @RequestParam(required = false) String entityType, Pageable pageable) {
        return ApiResponse.ok(systemOpsService.searchAuditLogs(entityType, pageable));
    }

    @GetMapping("/error-logs")
    @PreAuthorize("hasAuthority('audit.all')")
    public ApiResponse<PageResponse<ErrorLogDto>> errorLogs(
            @RequestParam(required = false) Boolean resolved, Pageable pageable) {
        return ApiResponse.ok(systemOpsService.listErrorLogs(resolved, pageable));
    }

    /** Nghiệp vụ "AI Engine & Feature Flags" — permission feature.manage / model.manage. */
    @GetMapping("/feature-flags")
    @PreAuthorize("hasAnyAuthority('feature.manage', 'model.manage')")
    public ApiResponse<List<FeatureFlagDto>> featureFlags() {
        return ApiResponse.ok(systemOpsService.listFeatureFlags());
    }

    @PutMapping("/feature-flags/{key}")
    @PreAuthorize("hasAuthority('feature.manage')")
    public ApiResponse<FeatureFlagDto> updateFeatureFlag(
            @PathVariable String key,
            @Valid @RequestBody UpdateFeatureFlagRequest request,
            @AuthenticationPrincipal JwtPrincipal actor
    ) {
        return ApiResponse.ok(systemOpsService.updateFeatureFlag(key, request, actor.userId()), "Đã cập nhật feature flag");
    }

    @GetMapping("/model-versions")
    @PreAuthorize("hasAuthority('model.manage')")
    public ApiResponse<List<ModelVersionDto>> modelVersions(@RequestParam(required = false) String modelName) {
        return ApiResponse.ok(systemOpsService.listModelVersions(modelName));
    }
}
