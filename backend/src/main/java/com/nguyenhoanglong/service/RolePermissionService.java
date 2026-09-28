package com.nguyenhoanglong.service;

import com.nguyenhoanglong.constant.PermissionConstants;
import com.nguyenhoanglong.entity.RolePermissionEntity;
import com.nguyenhoanglong.repository.RolePermissionRepository;
import com.nguyenhoanglong.repository.RoleRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class RolePermissionService {
    private final RolePermissionRepository rolePermissionRepository;
    private final RoleRepository roleRepository;
    private final DataAuditService dataAuditService;

    public RolePermissionService(RolePermissionRepository rolePermissionRepository,
                                 RoleRepository roleRepository,
                                 DataAuditService dataAuditService) {
        this.rolePermissionRepository = rolePermissionRepository;
        this.roleRepository = roleRepository;
        this.dataAuditService = dataAuditService;
    }

    @Cacheable(value = "role_permissions", key = "#roleCode")
    public List<RolePermissionEntity> getPermissionsForRole(String roleCode) {
        return rolePermissionRepository.findByRoleCode(roleCode);
    }

    /**
     * True when the role exists in the roles table, i.e. an administrator owns its
     * permission set. For such a role an empty permission list is a deliberate
     * revocation and must NOT be replaced by the hardcoded defaults.
     */
    @Cacheable(value = "role_configured", key = "#roleCode")
    public boolean isRoleConfigured(String roleCode) {
        return roleCode != null && roleRepository.existsById(roleCode);
    }

    private void checkPrivilegeEscalation(String roleCode, String permission) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new RuntimeException("Unauthorized");
        }
        boolean isSuperAdmin = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> a.equals("ROLE_ADMIN"));
        
        if (!isSuperAdmin && (roleCode.equalsIgnoreCase("ADMIN") 
                || permission.equalsIgnoreCase("MANAGE_ROLE_PERMISSION") 
                || permission.equalsIgnoreCase("MANAGE_USER"))) {
            throw new RuntimeException("Chỉ ADMIN gốc mới được phép sửa đổi quyền ADMIN hoặc cấp quyền hệ thống nhạy cảm.");
        }
    }

    @Transactional
    @CacheEvict(value = "role_permissions", key = "#roleCode")
    public RolePermissionEntity assignPermission(String roleCode, String permission) {
        if (!PermissionConstants.isValidPermission(permission)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Mã quyền không hợp lệ: " + permission + ". Chỉ chấp nhận quyền đã được định nghĩa trong hệ thống.");
        }
        checkPrivilegeEscalation(roleCode, permission);

        List<RolePermissionEntity> existing = rolePermissionRepository.findByRoleCode(roleCode);
        for (RolePermissionEntity p : existing) {
            if (p.getPermission().equalsIgnoreCase(permission)) {
                return p;
            }
        }
        RolePermissionEntity newPermission = new RolePermissionEntity();
        newPermission.setRoleCode(roleCode);
        newPermission.setPermission(permission);
        RolePermissionEntity saved = rolePermissionRepository.save(newPermission);
        
        String adminId = SecurityContextHolder.getContext().getAuthentication().getName();
        dataAuditService.logAudit(adminId, "GRANT_PERMISSION", "Role", roleCode, "Assigned permission: " + permission);
        
        return saved;
    }

    @Transactional
    @CacheEvict(value = "role_permissions", key = "#roleCode")
    public void revokePermission(String roleCode, String permission) {
        checkPrivilegeEscalation(roleCode, permission);
        
        List<RolePermissionEntity> existing = rolePermissionRepository.findByRoleCode(roleCode);
        for (RolePermissionEntity p : existing) {
            if (p.getPermission().equalsIgnoreCase(permission)) {
                rolePermissionRepository.delete(p);
                String adminId = SecurityContextHolder.getContext().getAuthentication().getName();
                dataAuditService.logAudit(adminId, "REVOKE_PERMISSION", "Role", roleCode, "Revoked permission: " + permission);
                break;
            }
        }
    }
}

