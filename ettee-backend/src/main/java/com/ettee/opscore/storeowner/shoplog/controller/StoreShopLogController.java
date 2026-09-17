package com.ettee.opscore.storeowner.shoplog.controller;

import com.ettee.opscore.common.dto.ApiResponse;
import com.ettee.opscore.common.dto.PageResponse;
import com.ettee.opscore.systemops.dto.AuditLogDto;
import com.ettee.opscore.systemops.service.SystemOpsService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Nghiệp vụ "Xem log của shop" — permission audit.shop (hẹp hơn audit.all của Admin). */
@RestController
@RequestMapping("/api/store-owner/shop-logs")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('audit.shop')")
public class StoreShopLogController {

    private final SystemOpsService systemOpsService;

    @GetMapping
    public ApiResponse<PageResponse<AuditLogDto>> list(
            @RequestParam(required = false) String entityType, Pageable pageable
    ) {
        return ApiResponse.ok(systemOpsService.searchAuditLogs(entityType, pageable));
    }
}
