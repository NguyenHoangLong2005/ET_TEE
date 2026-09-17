package com.ettee.opscore.admin.dto;

import com.ettee.opscore.identity.entity.AccountStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UserSummaryDto(
        UUID id,
        String fullName,
        String email,
        String phone,
        AccountStatus status,
        boolean isStaff,
        List<String> roleCodes,
        Instant createdAt,
        Instant lastLoginAt
) {
}
