package com.ettee.opscore.security;

import java.util.UUID;

/**
 * Principal nhẹ gắn vào SecurityContext sau khi verify JWT (không cần query lại DB).
 * Lấy ra trong controller bằng: @AuthenticationPrincipal JwtPrincipal principal
 */
public record JwtPrincipal(UUID userId, String username) {
}
