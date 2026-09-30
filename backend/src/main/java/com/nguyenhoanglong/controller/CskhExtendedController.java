package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.UserRepository;
import com.nguyenhoanglong.service.CskhExtendedService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping({"/api/staff/cskh", "/api/cskh"})
public class CskhExtendedController {

    private final CskhExtendedService cskhExtendedService;
    private final UserRepository userRepository;

    public CskhExtendedController(CskhExtendedService cskhExtendedService, UserRepository userRepository) {
        this.cskhExtendedService = cskhExtendedService;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        }
        String name = auth.getName();
        return userRepository.findByEmail(name)
                .orElseGet(() -> userRepository.findById(name)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không tìm thấy người dùng")));
    }

    @PostMapping("/orders/lookup")
    @PreAuthorize("hasAnyRole('ADMIN', 'CSKH_STAFF')")
    public ResponseEntity<ApiResponse<RestrictedOrderLookupDto>> lookupOrder(@Valid @RequestBody OrderLookupRequestDto dto) {
        User actor = getCurrentUser();
        RestrictedOrderLookupDto result = cskhExtendedService.lookupOrder(actor, dto);
        return ResponseEntity.ok(ApiResponse.success("Tra cứu thông tin đơn hàng thành công", result));
    }

    @PostMapping("/vouchers/grant")
    @PreAuthorize("hasAnyRole('ADMIN', 'CSKH_STAFF')")
    public ResponseEntity<ApiResponse<CskhVoucherGrantDto>> issueCompensationVoucher(@Valid @RequestBody IssueCompensationVoucherDto dto) {
        User actor = getCurrentUser();
        CskhVoucherGrantDto result = cskhExtendedService.issueCompensationVoucher(actor, dto);
        return ResponseEntity.ok(ApiResponse.success("Phát voucher tri ân/đền bù thành công", result));
    }

    @GetMapping("/vouchers/quota")
    @PreAuthorize("hasAnyRole('ADMIN', 'CSKH_STAFF')")
    public ResponseEntity<ApiResponse<CskhQuotaStatusDto>> getMyQuotaStatus() {
        User actor = getCurrentUser();
        CskhQuotaStatusDto result = cskhExtendedService.getMyQuotaStatus(actor);
        return ResponseEntity.ok(ApiResponse.success("Lấy hạn mức voucher tri ân thành công", result));
    }

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAnyRole('ADMIN', 'SHOP_OWNER')")
    public ResponseEntity<ApiResponse<PaginatedResponseDto<OrderLookupAuditLogDto>>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        User actor = getCurrentUser();
        PaginatedResponseDto<OrderLookupAuditLogDto> result = cskhExtendedService.getAuditLogs(actor, page, size);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách audit log tra cứu thành công", result));
    }
}
