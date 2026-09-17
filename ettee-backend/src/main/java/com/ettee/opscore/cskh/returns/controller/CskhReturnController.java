package com.ettee.opscore.cskh.returns.controller;

import com.ettee.opscore.cskh.returns.dto.*;
import com.ettee.opscore.cskh.returns.entity.ReturnStatus;
import com.ettee.opscore.cskh.returns.service.RefundService;
import com.ettee.opscore.cskh.returns.service.ReturnService;
import com.ettee.opscore.common.dto.ApiResponse;
import com.ettee.opscore.common.dto.PageResponse;
import com.ettee.opscore.security.JwtPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cskh/returns")
@RequiredArgsConstructor
public class CskhReturnController {

    private final ReturnService returnService;
    private final RefundService refundService;

    @GetMapping
    @PreAuthorize("hasAuthority('return.handle')")
    public ApiResponse<PageResponse<ReturnRequestDto>> search(@RequestParam(required = false) ReturnStatus status, Pageable pageable) {
        return ApiResponse.ok(returnService.search(status, pageable));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('return.handle')")
    public ApiResponse<ReturnRequestDto> create(@Valid @RequestBody CreateReturnRequestDto dto, @AuthenticationPrincipal JwtPrincipal actor) {
        return ApiResponse.ok(returnService.create(dto, actor.userId()), "Đã tạo yêu cầu đổi/trả");
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('return.handle')")
    public ApiResponse<ReturnRequestDto> handle(
            @PathVariable UUID id, @Valid @RequestBody HandleReturnRequestDto dto, @AuthenticationPrincipal JwtPrincipal actor
    ) {
        return ApiResponse.ok(returnService.handle(id, dto, actor.userId()), "Đã cập nhật yêu cầu đổi/trả");
    }

    @GetMapping("/orders/{orderId}/refunds")
    @PreAuthorize("hasAnyAuthority('return.handle','refund.process')")
    public ApiResponse<List<RefundDto>> listRefunds(@PathVariable UUID orderId) {
        return ApiResponse.ok(refundService.listByOrder(orderId));
    }

    @PostMapping("/orders/{orderId}/refunds")
    @PreAuthorize("hasAuthority('refund.process')")
    public ApiResponse<RefundDto> processRefund(
            @PathVariable UUID orderId, @Valid @RequestBody CreateRefundRequest request, @AuthenticationPrincipal JwtPrincipal actor
    ) {
        return ApiResponse.ok(refundService.process(orderId, request, actor.userId()), "Đã xử lý hoàn tiền");
    }
}
