package com.ettee.opscore.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long accessTokenTtlMinutes;
    private final long refreshTokenTtlDays;

    public JwtService(
            @Value("${ettee.jwt.secret}") String secret,
            @Value("${ettee.jwt.access-token-ttl-minutes}") long accessTokenTtlMinutes,
            @Value("${ettee.jwt.refresh-token-ttl-days}") long refreshTokenTtlDays
    ) {
        // Secret cấu hình ở application.yml (nên override qua biến môi trường JWT_SECRET khi deploy).
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes());
        this.accessTokenTtlMinutes = accessTokenTtlMinutes;
        this.refreshTokenTtlDays = refreshTokenTtlDays;
    }

    public String generateAccessToken(SecurityUser user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getUsername())
                .claim("uid", user.getUserId().toString())
                .claim("typ", "access")
                .claim("roles", user.getRoleCodes())
                .claim("perms", user.getPermissionCodes())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTokenTtlMinutes, ChronoUnit.MINUTES)))
                .signWith(signingKey)
                .compact();
    }

    /**
     * Refresh token CHỈ mang uid + typ (KHÔNG mang roles/permissions) — để khi refresh, access token
     * mới luôn được nạp lại claim từ tham số truyền vào lúc gọi refresh (roles/perms hiện tại), tránh
     * việc refresh token cũ "đông cứng" quyền hạn đã bị thu hồi trong 7 ngày còn hạn của nó.
     */
    public String generateRefreshToken(UUID userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("uid", userId.toString())
                .claim("typ", "refresh")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(refreshTokenTtlDays, ChronoUnit.DAYS)))
                .signWith(signingKey)
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isValid(String token) {
        try {
            Claims claims = parseClaims(token);
            return claims.getExpiration().after(new Date());
        } catch (Exception e) {
            return false;
        }
    }

    /** true nếu token hợp lệ VÀ đúng là refresh token (không cho dùng access token giả làm refresh token). */
    public boolean isValidRefreshToken(String token) {
        try {
            Claims claims = parseClaims(token);
            return claims.getExpiration().after(new Date()) && "refresh".equals(claims.get("typ", String.class));
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    public UUID extractUserId(String token) {
        return UUID.fromString(parseClaims(token).get("uid", String.class));
    }

    @SuppressWarnings("unchecked")
    public List<String> extractRoles(String token) {
        return (List<String>) parseClaims(token).get("roles", List.class);
    }

    @SuppressWarnings("unchecked")
    public List<String> extractPermissions(String token) {
        return (List<String>) parseClaims(token).get("perms", List.class);
    }
}
