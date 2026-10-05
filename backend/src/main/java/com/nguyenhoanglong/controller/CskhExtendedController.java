package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.UserRepository;
import com.nguyenhoanglong.service.CskhExtendedService;
import com.nguyenhoanglong.service.ReviewService;
import java.util.List;
import java.util.Map;
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
    private final ReviewService reviewService;

    public CskhExtendedController(CskhExtendedService cskhExtendedService, UserRepository userRepository, ReviewService reviewService) {
        this.cskhExtendedService = cskhExtendedService;
        this.userRepository = userRepository;
        this.reviewService = reviewService;
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

    @GetMapping("/reviews")
    @PreAuthorize("hasAnyRole('ADMIN', 'CSKH_STAFF', 'SHOP_OWNER')")
    public ResponseEntity<List<StaffReviewDto>> getReviewsForStaff() {
        return ResponseEntity.ok(reviewService.getReviewsForStaff());
    }

    @PostMapping("/reviews/{id}/reply")
    @PreAuthorize("hasAnyRole('ADMIN', 'CSKH_STAFF', 'SHOP_OWNER')")
    public ResponseEntity<StaffReviewDto> replyToReview(@PathVariable Long id, @RequestBody Map<String, String> body) {
        User actor = getCurrentUser();
        return ResponseEntity.ok(reviewService.replyToReview(actor.getId(), id, body.get("replyMessage")));
    }

    @PatchMapping("/reviews/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'CSKH_STAFF', 'SHOP_OWNER')")
    public ResponseEntity<StaffReviewDto> updateReviewVisibility(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(reviewService.updateReviewVisibility(id, body.get("status")));
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
