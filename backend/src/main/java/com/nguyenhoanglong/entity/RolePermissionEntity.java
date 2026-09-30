package com.nguyenhoanglong.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "role_permissions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_role_permission", columnNames = {"role_code", "permission"})
})
public class RolePermissionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "role_code", nullable = false, length = 50)
    private String roleCode;

    @Column(nullable = false, length = 100)
    private String permission;

    public RolePermissionEntity() {}

    public RolePermissionEntity(Long id, String roleCode, String permission) {
        this.id = id;
        this.roleCode = roleCode;
        this.permission = permission;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRoleCode() { return roleCode; }
    public void setRoleCode(String roleCode) { this.roleCode = roleCode; }

    public String getPermission() { return permission; }
    public void setPermission(String permission) { this.permission = permission; }

    public static RolePermissionEntityBuilder builder() { return new RolePermissionEntityBuilder(); }

    public static class RolePermissionEntityBuilder {
        private Long id;
        private String roleCode;
        private String permission;

        public RolePermissionEntityBuilder id(Long id) { this.id = id; return this; }
        public RolePermissionEntityBuilder roleCode(String roleCode) { this.roleCode = roleCode; return this; }
        public RolePermissionEntityBuilder permission(String permission) { this.permission = permission; return this; }

        public RolePermissionEntity build() {
            return new RolePermissionEntity(id, roleCode, permission);
        }
    }
}
