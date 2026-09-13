package com.ettee.opscore.cskh.orderlookup.controller;

import com.ettee.opscore.cskh.orderlookup.dto.OrderDetailDto;
import com.ettee.opscore.cskh.orderlookup.dto.OrderSummaryDto;
import com.ettee.opscore.cskh.orderlookup.service.OrderLookupService;
import com.ettee.opscore.common.dto.ApiResponse;
import com.ettee.opscore.common.dto.PageResponse;
import com.ettee.opscore.order.entity.OrderStatus;
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

    @GetMapping
    public ApiResponse<PageResponse<OrderSummaryDto>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) OrderStatus status,
            Pageable pageable
    ) {
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
}
