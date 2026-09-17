package com.ettee.opscore.storeowner.promotion.controller;

import com.ettee.opscore.common.dto.ApiResponse;
import com.ettee.opscore.common.dto.PageResponse;
import com.ettee.opscore.security.JwtPrincipal;
import com.ettee.opscore.storeowner.promotion.dto.*;
import com.ettee.opscore.storeowner.promotion.entity.PromotionStatus;
import com.ettee.opscore.storeowner.promotion.service.PromotionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Nghiệp vụ "Phê duyệt khuyến mãi" — permission promotion.create (tạo) / promotion.approve (duyệt). */
@RestController
@RequestMapping("/api/store-owner/promotions")
@RequiredArgsConstructor
public class StorePromotionController {

    private final PromotionService promotionService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('promotion.approve','promotion.create')")
    public ApiResponse<PageResponse<PromotionDto>> list(@RequestParam(required = false) PromotionStatus status, Pageable pageable) {
        return ApiResponse.ok(promotionService.list(status, pageable));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('promotion.create')")
    public ApiResponse<PromotionDto> create(@Valid @RequestBody CreatePromotionRequest request, @AuthenticationPrincipal JwtPrincipal actor) {
        return ApiResponse.ok(promotionService.create(request, actor.userId()), "Đã gửi khuyến mãi, chờ phê duyệt");
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('promotion.approve')")
    public ApiResponse<PromotionDto> approve(@PathVariable UUID id, @AuthenticationPrincipal JwtPrincipal actor) {
        return ApiResponse.ok(promotionService.approve(id, actor.userId()), "Đã duyệt khuyến mãi");
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('promotion.approve')")
    public ApiResponse<PromotionDto> reject(@PathVariable UUID id, @Valid @RequestBody RejectPromotionRequest request,
                                             @AuthenticationPrincipal JwtPrincipal actor) {
        return ApiResponse.ok(promotionService.reject(id, actor.userId(), request.reason()), "Đã từ chối khuyến mãi");
    }
}
