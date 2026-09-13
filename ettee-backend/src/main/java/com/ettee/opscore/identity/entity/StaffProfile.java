package com.ettee.opscore.identity.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "staff_profile", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class StaffProfile {

    @Id
    @Column(name = "user_id", columnDefinition = "uuid")
    private UUID userId;

    @Column(name = "employee_code", nullable = false, unique = true, length = 30)
    private String employeeCode;

    @Column(length = 100)
    private String department;

    @Column(name = "hired_at")
    private LocalDate hiredAt;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
