package com.nguyenhoanglong.controller.admin;

import com.nguyenhoanglong.constant.PermissionConstants;
import com.nguyenhoanglong.dto.ApiResponse;
import com.nguyenhoanglong.dto.PermissionCatalogDto;
import com.nguyenhoanglong.dto.RoleWithPermissionsDto;
import com.nguyenhoanglong.entity.RoleEntity;
import com.nguyenhoanglong.entity.RolePermissionEntity;
import com.nguyenhoanglong.service.RolePermissionService;
import com.nguyenhoanglong.service.RoleService;
import com.nguyenhoanglong.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/rbac")
@PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_ROLE_PERMISSION)")
public class AdminRbacController {

    private final RoleService roleService;
    private final RolePermissionService rolePermissionService;
    private final UserService userService;

    public AdminRbacController(RoleService roleService, RolePermissionService rolePermissionService, UserService userService) {
        this.roleService = roleService;
        this.rolePermissionService = rolePermissionService;
        this.userService = userService;
    }

    @GetMapping("/permissions")
    public ResponseEntity<ApiResponse<List<PermissionCatalogDto>>> getPermissionCatalog() {
        List<PermissionCatalogDto> catalog = PermissionConstants.getAllPermissions();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh mục quyền thành công", catalog));
    }

    @GetMapping("/roles")
    public ResponseEntity<ApiResponse<List<RoleWithPermissionsDto>>> getRoles() {
        List<RoleWithPermissionsDto> roles = userService.getAllRolesWithPermissions();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách vai trò và quyền thành công", roles));
    }

    @PostMapping("/roles")
    public ResponseEntity<ApiResponse<RoleEntity>> createRole(@RequestBody RoleEntity role) {
        RoleEntity created = roleService.createRole(role);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Tạo Role thành công", created));
    }

    @DeleteMapping("/roles/{code}")
    public ResponseEntity<ApiResponse<Void>> deleteRole(@PathVariable String code) {
        roleService.deleteRole(code);
        return ResponseEntity.ok(ApiResponse.success("Xóa Role thành công", null));
    }

    @GetMapping("/roles/{code}/permissions")
    public ResponseEntity<ApiResponse<List<RolePermissionEntity>>> getPermissions(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách quyền thành công", rolePermissionService.getPermissionsForRole(code)));
    }

    @PostMapping("/roles/{code}/permissions")
    public ResponseEntity<ApiResponse<RolePermissionEntity>> assignPermission(
            @PathVariable String code,
            @RequestBody java.util.Map<String, String> body) {
        String permission = body.get("permission");
        RolePermissionEntity assigned = rolePermissionService.assignPermission(code, permission);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Gán quyền thành công", assigned));
    }

    @DeleteMapping("/roles/{code}/permissions/{permission}")
    public ResponseEntity<ApiResponse<Void>> revokePermission(
            @PathVariable String code,
            @PathVariable String permission) {
        rolePermissionService.revokePermission(code, permission);
        return ResponseEntity.ok(ApiResponse.success("Thu hồi quyền thành công", null));
    }
}

