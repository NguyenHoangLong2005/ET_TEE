package com.nguyenhoanglong.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${app.jwt.secret}")
    private String secretKey;

    @Value("${app.jwt.expiration}")
    private long jwtExpiration;

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public String extractUserId(String token) {
        return extractClaim(token, claims -> claims.get("userId", String.class));
    }

    public String extractRole(String token) {
        return extractClaim(token, claims -> claims.get("role", String.class));
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(String username, String userId) {
        return generateToken(new HashMap<>(), username, userId);
    }

    public String generateToken(Map<String, Object> extraClaims, String username, String userId) {
        extraClaims.put("userId", userId);
        return Jwts
                .builder()
                .setClaims(extraClaims)
                .setSubject(username)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean isTokenValid(String token, String username) {
        final String extractedUsername = extractUsername(token);
        return (extractedUsername.equals(username)) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts
                .parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    /**
     * Build a signing key that is guaranteed to be >= 256 bits (32 bytes) as
     * required by RFC 7518 for HMAC-SHA algorithms. We derive the key bytes
     * deterministically from the configured secret:
     *   - Treat the secret as UTF-8 bytes (handles plain or Base64-ish strings).
     *   - SHA-256 the bytes to obtain a uniform 32-byte key.
     * This protects against misconfigured / short secrets (e.g. legacy 32-char
     * values, or Base64 strings that decode to < 32 bytes) without changing
     * the algorithm used to sign/verify tokens.
     */
    private SecretKey getSignInKey() {
        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException("app.jwt.secret is not configured");
        }
        byte[] material = secretKey.trim().getBytes(StandardCharsets.UTF_8);
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(material);
            return Keys.hmacShaKeyFor(digest);
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is mandatory in every JRE; this branch is unreachable.
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
