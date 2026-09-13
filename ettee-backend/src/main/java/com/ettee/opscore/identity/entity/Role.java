package com.ettee.opscore.identity.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "roles", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class Role {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    // Cột này được trigger DB dùng để tự tính lại users.is_staff khi gán/gỡ role — chỉ đọc từ phía app.
    @Column(name = "is_staff_role", nullable = false)
    private boolean staffRole = false;

    // role_permissions không có cột phụ ngoài 2 khóa -> map thẳng bằng @ManyToMany + @JoinTable
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "role_permissions",
            schema = "ettee",
            joinColumns = @JoinColumn(name = "role_id"),
            inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    private Set<Permission> permissions = new HashSet<>();
}
