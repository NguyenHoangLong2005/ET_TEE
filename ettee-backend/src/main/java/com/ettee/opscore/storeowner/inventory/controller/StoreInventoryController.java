package com.ettee.opscore.storeowner.inventory.controller;

import com.ettee.opscore.common.dto.ApiResponse;
import com.ettee.opscore.common.dto.PageResponse;
import com.ettee.opscore.security.JwtPrincipal;
import com.ettee.opscore.storeowner.inventory.dto.*;
import com.ettee.opscore.storeowner.inventory.entity.ApprovalStatus;
import com.ettee.opscore.storeowner.inventory.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Nghiệp vụ "Tồn kho & Phê duyệt điều chỉnh" — permission inventory.adjust.request / inventory.adjust.approve. */
@RestController
@RequestMapping("/api/store-owner/inventory")
@RequiredArgsConstructor
public class StoreInventoryController {

    private final InventoryService inventoryService;

    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyAuthority('report.view','inventory.adjust.approve')")
    public ApiResponse<PageResponse<InventoryDto>> lowStock(Pageable pageable) {
        return ApiResponse.ok(inventoryService.lowStock(pageable));
    }

    @PostMapping("/adjustment-requests")
    @PreAuthorize("hasAuthority('inventory.adjust.request')")
    public ApiResponse<StockAdjustmentRequestDto> createRequest(
            @Valid @RequestBody CreateAdjustmentRequestDto dto,
            @AuthenticationPrincipal JwtPrincipal actor
    ) {
        return ApiResponse.ok(inventoryService.createAdjustmentRequest(dto, actor.userId()), "Đã gửi đề xuất điều chỉnh tồn kho, chờ phê duyệt");
    }

    @GetMapping("/adjustment-requests")
    @PreAuthorize("hasAnyAuthority('inventory.adjust.approve','inventory.adjust.request')")
    public ApiResponse<PageResponse<StockAdjustmentRequestDto>> listRequests(
            @RequestParam(required = false) ApprovalStatus status, Pageable pageable
    ) {
        return ApiResponse.ok(inventoryService.listRequests(status, pageable));
    }

    @PostMapping("/adjustment-requests/{id}/approve")
    @PreAuthorize("hasAuthority('inventory.adjust.approve')")
    public ApiResponse<StockAdjustmentRequestDto> approve(@PathVariable UUID id, @AuthenticationPrincipal JwtPrincipal actor) {
        return ApiResponse.ok(inventoryService.approve(id, actor.userId()), "Đã phê duyệt & cập nhật tồn kho");
    }

    @PostMapping("/adjustment-requests/{id}/reject")
    @PreAuthorize("hasAuthority('inventory.adjust.approve')")
    public ApiResponse<StockAdjustmentRequestDto> reject(
            @PathVariable UUID id, @Valid @RequestBody RejectRequestDto dto, @AuthenticationPrincipal JwtPrincipal actor
    ) {
        return ApiResponse.ok(inventoryService.reject(id, actor.userId(), dto.reason()), "Đã từ chối yêu cầu");
    }
}
