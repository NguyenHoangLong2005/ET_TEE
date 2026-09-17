package com.ettee.opscore.admin.controller;

import com.ettee.opscore.admin.dto.*;
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

import java.util.UUID;

/**
 * Nghiệp vụ "Tài khoản & Khóa user" — thuộc quyền permission account.manage (role admin).
 */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('account.manage')")
public class AdminUserController {

    private final UserAdminService userAdminService;

    @GetMapping
    public ApiResponse<PageResponse<UserSummaryDto>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean isStaff,
            Pageable pageable
    ) {
        return ApiResponse.ok(userAdminService.search(keyword, isStaff, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<UserSummaryDto> getById(@PathVariable UUID id) {
        return ApiResponse.ok(userAdminService.getById(id));
    }

    @PostMapping
    public ApiResponse<UserSummaryDto> createStaffUser(
            @Valid @RequestBody CreateStaffUserRequest request,
            @AuthenticationPrincipal JwtPrincipal actor
    ) {
        return ApiResponse.ok(userAdminService.createStaffUser(request, actor), "Tạo tài khoản nhân viên thành công");
    }

    @PostMapping("/{id}/lock")
    public ApiResponse<Void> lock(
            @PathVariable UUID id,
            @Valid @RequestBody LockUserRequest request,
            @AuthenticationPrincipal JwtPrincipal actor
    ) {
        userAdminService.lockUser(id, request.reason(), actor);
        return ApiResponse.message("Đã khóa tài khoản");
    }

    @PostMapping("/{id}/unlock")
    public ApiResponse<Void> unlock(@PathVariable UUID id) {
        userAdminService.unlockUser(id);
        return ApiResponse.message("Đã mở khóa tài khoản");
    }

    @PostMapping("/{id}/roles")
    public ApiResponse<Void> assignRole(
            @PathVariable UUID id,
            @Valid @RequestBody AssignRoleRequest request,
            @AuthenticationPrincipal JwtPrincipal actor
    ) {
        userAdminService.assignRole(id, request.roleCode(), actor);
        return ApiResponse.message("Đã gán role");
    }

    @DeleteMapping("/{id}/roles/{roleCode}")
    public ApiResponse<Void> revokeRole(
            @PathVariable UUID id,
            @PathVariable String roleCode,
            @AuthenticationPrincipal JwtPrincipal actor
    ) {
        userAdminService.revokeRole(id, roleCode, actor);
        return ApiResponse.message("Đã gỡ role");
    }
}
