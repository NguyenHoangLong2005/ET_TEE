package com.ettee.opscore.cskh.orderlookup.controller;

import com.ettee.opscore.cskh.orderlookup.dto.OrderDetailDto;
import com.ettee.opscore.cskh.orderlookup.dto.OrderSummaryDto;
import com.ettee.opscore.cskh.orderlookup.service.OrderLookupService;
import com.ettee.opscore.common.dto.ApiResponse;
import com.ettee.opscore.common.dto.PageResponse;
import com.ettee.opscore.order.entity.OrderStatus;
import com.ettee.opscore.order.dto.ChangeOrderStatusRequest;
import com.ettee.opscore.order.service.OrderWorkflowService;
import com.ettee.opscore.security.JwtPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Nghiệp vụ "Tra cứu đơn ở mức cần thiết" — permission order.view. */
@RestController
@RequestMapping("/api/cskh/orders")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('order.view')")
public class CskhOrderController {

    private final OrderLookupService orderLookupService;
    private final OrderWorkflowService orderWorkflowService;

    @GetMapping
    public ApiResponse<PageResponse<OrderSummaryDto>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) OrderStatus status,
            Pageable pageable) {
        return ApiResponse.ok(orderLookupService.search(keyword, status, pageable));
    }

    @GetMapping("/by-code/{orderCode}")
    public ApiResponse<OrderDetailDto> getByCode(@PathVariable String orderCode) {
        return ApiResponse.ok(orderLookupService.getByCode(orderCode));
    }

    @GetMapping("/{id}")
    public ApiResponse<OrderDetailDto> getById(@PathVariable UUID id) {
        return ApiResponse.ok(orderLookupService.getById(id));
    }

    @PostMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('order.confirm','order.cancel','order.pick','order.pack','order.handover','order.deliver')")
    public ApiResponse<OrderDetailDto> changeStatus(
            @PathVariable UUID id,
            @Valid @RequestBody ChangeOrderStatusRequest request,
            @AuthenticationPrincipal JwtPrincipal actor) {
        orderWorkflowService.change(id, request, actor);
        return ApiResponse.ok(orderLookupService.getById(id), "Đã cập nhật trạng thái đơn hàng");
    }
}
