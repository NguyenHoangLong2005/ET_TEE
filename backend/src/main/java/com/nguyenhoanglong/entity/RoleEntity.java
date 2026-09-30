package com.nguyenhoanglong.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "roles")
public class RoleEntity {

    @Id
    @Column(length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 255)
    private String description;

    public RoleEntity() {}

    public RoleEntity(String code, String name, String description) {
        this.code = code;
        this.name = name;
        this.description = description;
    }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public static RoleEntityBuilder builder() { return new RoleEntityBuilder(); }

    public static class RoleEntityBuilder {
        private String code;
        private String name;
        private String description;

        public RoleEntityBuilder code(String code) { this.code = code; return this; }
        public RoleEntityBuilder name(String name) { this.name = name; return this; }
        public RoleEntityBuilder description(String description) { this.description = description; return this; }

        public RoleEntity build() {
            return new RoleEntity(code, name, description);
        }
    }
}
