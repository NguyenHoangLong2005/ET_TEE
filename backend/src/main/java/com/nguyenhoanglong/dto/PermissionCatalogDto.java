package com.nguyenhoanglong.dto;

public class PermissionCatalogDto {
    private String code;
    private String group;
    private String name;
    private String description;

    public PermissionCatalogDto() {}

    public PermissionCatalogDto(String code, String group, String name, String description) {
        this.code = code;
        this.group = group;
        this.name = name;
        this.description = description;
    }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getGroup() { return group; }
    public void setGroup(String group) { this.group = group; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
