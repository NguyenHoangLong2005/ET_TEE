package com.ettee.opscore.admin.service;

import com.ettee.opscore.admin.dto.PermissionDto;
import com.ettee.opscore.admin.dto.RoleDto;
import com.ettee.opscore.admin.dto.UpdateRolePermissionsRequest;
import com.ettee.opscore.common.exception.AppExceptions;
import com.ettee.opscore.identity.entity.Permission;
import com.ettee.opscore.identity.entity.Role;
import com.ettee.opscore.identity.repository.PermissionRepository;
import com.ettee.opscore.identity.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * "Ma trận phân quyền": danh sách role x permission, cho phép Admin tick/untick
 * để cấu hình role -> permission (bảng role_permissions).
 */
@Service
@RequiredArgsConstructor
public class RolePermissionService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    @Transactional(readOnly = true)
    public List<RoleDto> listRoles() {
        return roleRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<PermissionDto> listPermissions() {
        return permissionRepository.findAll().stream()
                .map(p -> new PermissionDto(p.getId(), p.getCode(), p.getDescription()))
                .toList();
    }

    @Transactional
    public RoleDto updateRolePermissions(String roleCode, UpdateRolePermissionsRequest request) {
        Role role = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Role", roleCode));

        if ("admin".equals(roleCode)) {
            throw new AppExceptions.BusinessRuleViolationException(
                    "Không thể chỉnh sửa quyền của role 'admin' — role này luôn có toàn quyền hệ thống");
        }

        List<Permission> permissions = permissionRepository.findAll().stream()
                .filter(p -> request.permissionCodes().contains(p.getCode()))
                .toList();

        Set<Permission> newSet = new HashSet<>(permissions);
        role.setPermissions(newSet);
        roleRepository.save(role);
        return toDto(role);
    }

    private RoleDto toDto(Role role) {
        List<String> permCodes = role.getPermissions().stream().map(Permission::getCode).sorted().toList();
        return new RoleDto(role.getId(), role.getCode(), role.getName(), role.getDescription(), role.isStaffRole(), permCodes);
    }
}
