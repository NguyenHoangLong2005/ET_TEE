package com.ettee.opscore.storeowner.dashboard.controller;

import com.ettee.opscore.common.dto.ApiResponse;
import com.ettee.opscore.storeowner.dashboard.dto.DashboardSummaryDto;
import com.ettee.opscore.storeowner.dashboard.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/** Nghiệp vụ "Dashboard doanh thu, đơn hàng, tồn kho, tỷ lệ hủy/hoàn" — permission report.view. */
@RestController
@RequestMapping("/api/store-owner/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('report.view')")
public class StoreDashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    public ApiResponse<DashboardSummaryDto> summary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ApiResponse.ok(dashboardService.summary(from, to));
    }
}
