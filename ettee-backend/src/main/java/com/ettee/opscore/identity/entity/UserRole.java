package com.ettee.opscore.identity.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_roles", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class UserRole {

    @EmbeddedId
    private UserRoleId id;

    // Chỉ đọc kèm để tiện lấy code/name của role khi query — khóa thật vẫn là id (embedded).
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("roleId")
    @JoinColumn(name = "role_id")
    private Role role;

    @Column(name = "assigned_by", columnDefinition = "uuid")
    private UUID assignedBy;

    @Column(name = "assigned_at", nullable = false)
    private Instant assignedAt;

    @PrePersist
    void prePersist() {
        if (assignedAt == null) assignedAt = Instant.now();
    }

    public static UserRole of(UUID userId, UUID roleId, UUID assignedBy) {
        UserRole ur = new UserRole();
        ur.setId(new UserRoleId(userId, roleId));
        ur.setAssignedBy(assignedBy);
        return ur;
    }
}
