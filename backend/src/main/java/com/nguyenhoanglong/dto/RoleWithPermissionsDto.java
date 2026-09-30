package com.nguyenhoanglong.dto;

import java.util.List;

public class RoleWithPermissionsDto {
    private String code;
    private String name;
    private String description;
    private List<String> permissions;

    public RoleWithPermissionsDto() {}

    public RoleWithPermissionsDto(String code, String name, String description, List<String> permissions) {
        this.code = code;
        this.name = name;
        this.description = description;
        this.permissions = permissions;
    }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<String> getPermissions() { return permissions; }
    public void setPermissions(List<String> permissions) { this.permissions = permissions; }

    public static RoleWithPermissionsDtoBuilder builder() { return new RoleWithPermissionsDtoBuilder(); }

    public static class RoleWithPermissionsDtoBuilder {
        private String code;
        private String name;
        private String description;
        private List<String> permissions;

        public RoleWithPermissionsDtoBuilder code(String code) { this.code = code; return this; }
        public RoleWithPermissionsDtoBuilder name(String name) { this.name = name; return this; }
        public RoleWithPermissionsDtoBuilder description(String description) { this.description = description; return this; }
        public RoleWithPermissionsDtoBuilder permissions(List<String> permissions) { this.permissions = permissions; return this; }

        public RoleWithPermissionsDto build() {
            return new RoleWithPermissionsDto(code, name, description, permissions);
        }
    }
}
