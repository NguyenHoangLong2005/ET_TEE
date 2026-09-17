package com.ettee.opscore.identity.dto;

import java.util.List;
import java.util.UUID;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        UUID userId,
        String fullName,
        List<String> roles,
        List<String> permissions
) {
    public static LoginResponse of(String accessToken, String refreshToken, UUID userId, String fullName,
                                    List<String> roles, List<String> perms) {
        return new LoginResponse(accessToken, refreshToken, "Bearer", userId, fullName, roles, perms);
    }
}
