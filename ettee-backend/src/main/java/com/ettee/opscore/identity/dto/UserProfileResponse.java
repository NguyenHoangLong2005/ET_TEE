package com.ettee.opscore.identity.dto;

import com.ettee.opscore.identity.entity.AccountStatus;

import java.util.List;
import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String fullName,
        String email,
        String phone,
        AccountStatus status,
        List<String> roles,
        List<String> permissions) {
}
