package com.ettee.opscore.cskh.ticket.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "staff_support_limits", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class StaffSupportLimit {

    @Id
    @Column(name = "user_id", columnDefinition = "uuid")
    private UUID userId;

    @Column(name = "max_per_code", nullable = false, precision = 12, scale = 2)
    private BigDecimal maxPerCode;

    @Column(name = "max_per_day", nullable = false, precision = 12, scale = 2)
    private BigDecimal maxPerDay;

    @Column(name = "updated_by", columnDefinition = "uuid")
    private UUID updatedBy;
}
