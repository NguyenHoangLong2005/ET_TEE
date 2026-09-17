package com.ettee.opscore.admin.controller;

import com.ettee.opscore.admin.dto.PermissionDto;
import com.ettee.opscore.admin.dto.RoleDto;
import com.ettee.opscore.admin.dto.UpdateRolePermissionsRequest;
import com.ettee.opscore.admin.service.RolePermissionService;
import com.ettee.opscore.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Nghiệp vụ "Ma trận phân quyền" — thuộc permission rbac.manage. */
@RestController
@RequestMapping("/api/admin/rbac")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('rbac.manage')")
public class AdminRolePermissionController {

    private final RolePermissionService rolePermissionService;

    @GetMapping("/roles")
    public ApiResponse<List<RoleDto>> listRoles() {
        return ApiResponse.ok(rolePermissionService.listRoles());
    }

    @GetMapping("/permissions")
    public ApiResponse<List<PermissionDto>> listPermissions() {
        return ApiResponse.ok(rolePermissionService.listPermissions());
    }

    @PutMapping("/roles/{roleCode}/permissions")
    public ApiResponse<RoleDto> updateRolePermissions(
            @PathVariable String roleCode,
            @RequestBody UpdateRolePermissionsRequest request
    ) {
        return ApiResponse.ok(rolePermissionService.updateRolePermissions(roleCode, request), "Đã cập nhật quyền cho role");
    }
}
