package com.ettee.opscore.storeowner.shoplog.controller;

import com.ettee.opscore.admin.dto.CreateStaffUserRequest;
import com.ettee.opscore.admin.dto.UserSummaryDto;
import com.ettee.opscore.admin.service.UserAdminService;
import com.ettee.opscore.common.dto.ApiResponse;
import com.ettee.opscore.common.dto.PageResponse;
import com.ettee.opscore.security.JwtPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Nghiệp vụ "Nhân sự chi nhánh" — Chủ cửa hàng tạo/tra cứu nhân viên bán hàng, kho, CSKH...
 * Tái dùng UserAdminService (đã có sẵn create/search) nhưng gate quyền riêng bằng staff.manage
 * (khác account.manage của Admin) — Chủ cửa hàng KHÔNG được tạo role 'admin'; ràng buộc đó nằm ở
 * chỗ danh sách role hợp lệ hiển thị trên UI, phía backend vẫn tin tưởng theo permission model chung.
 */
@RestController
@RequestMapping("/api/store-owner/staff")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('staff.manage')")
public class StoreStaffController {

    private final UserAdminService userAdminService;

    @GetMapping
    public ApiResponse<PageResponse<UserSummaryDto>> search(
            @RequestParam(required = false) String keyword, Pageable pageable
    ) {
        return ApiResponse.ok(userAdminService.search(keyword, true, pageable));
    }

    @PostMapping
    public ApiResponse<UserSummaryDto> create(
            @Valid @RequestBody CreateStaffUserRequest request,
            @AuthenticationPrincipal JwtPrincipal actor
    ) {
        return ApiResponse.ok(userAdminService.createStaffUser(request, actor), "Đã tạo nhân sự mới");
    }
}
