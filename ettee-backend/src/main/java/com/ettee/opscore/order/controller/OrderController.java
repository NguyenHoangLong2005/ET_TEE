package com.ettee.opscore.order.controller;

import com.ettee.opscore.cskh.orderlookup.dto.OrderDetailDto;
import com.ettee.opscore.cskh.orderlookup.dto.OrderSummaryDto;
import com.ettee.opscore.cskh.orderlookup.service.OrderLookupService;
import com.ettee.opscore.common.dto.ApiResponse;
import com.ettee.opscore.common.exception.AppExceptions;
import com.ettee.opscore.order.dto.CheckoutRequest;
import com.ettee.opscore.order.dto.CheckoutResponse;
import com.ettee.opscore.order.repository.CustomerRepository;
import com.ettee.opscore.order.service.CheckoutService;
import com.ettee.opscore.security.JwtPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class OrderController {

    private final CheckoutService checkoutService;
    private final OrderLookupService orderLookupService;
    private final CustomerRepository customerRepository;

    @PostMapping("/orders/checkout")
    public ApiResponse<CheckoutResponse> checkout(
            @AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody CheckoutRequest request) {
        return ApiResponse.ok(checkoutService.checkout(principal.userId(), request), "Đặt hàng thành công");
    }

    @GetMapping("/orders/my-orders")
    public ApiResponse<List<OrderSummaryDto>> myOrders(@AuthenticationPrincipal JwtPrincipal principal) {
        var customer = customerRepository.findByUserId(principal.userId());

        if (customer.isEmpty()) {
            return ApiResponse.ok(List.of(), "Bạn chưa có đơn hàng nào");
        }

        return ApiResponse.ok(orderLookupService.getByCustomerId(customer.get().getId()),
                "Lấy lịch sử đơn hàng thành công");
    }

    @GetMapping("/orders/my-orders/{orderCode}")
    public ApiResponse<OrderDetailDto> myOrderByCode(
            @AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String orderCode) {
        var customer = customerRepository.findByUserId(principal.userId())
                .orElseThrow(() -> new AppExceptions.AuthenticationFailedException("Bạn chưa có thông tin khách hàng"));

        OrderDetailDto order = orderLookupService.getByCode(orderCode);

        if (!customer.getId().equals(order.customerId())) {
            throw new AppExceptions.ForbiddenActionException("Bạn không có quyền xem đơn hàng này");
        }

        return ApiResponse.ok(order, "Lấy chi tiết đơn hàng thành công");
    }
}
