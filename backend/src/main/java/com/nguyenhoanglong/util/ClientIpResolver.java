package com.nguyenhoanglong.util;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Resolves the real client IP behind the Next.js reverse proxy.
 *
 * The Next server proxies every /api/** call, so getRemoteAddr() is the proxy's own address.
 * X-Forwarded-For is only honoured when the direct TCP peer is our own proxy (loopback);
 * otherwise a direct caller could spoof the header and forge the audit trail.
 * (Same trust rule as RateLimitFilter.)
 */
public final class ClientIpResolver {

    private ClientIpResolver() {}

    public static String resolve(HttpServletRequest request) {
        if (request == null) return null;
        String remoteAddr = request.getRemoteAddr();
        if (isLoopback(remoteAddr)) {
            String forwardedFor = request.getHeader("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank()) {
                return forwardedFor.split(",")[0].trim();
            }
            String realIp = request.getHeader("X-Real-IP");
            if (realIp != null && !realIp.isBlank()) {
                return realIp.trim();
            }
        }
        return remoteAddr;
    }

    public static boolean isLoopback(String address) {
        return "127.0.0.1".equals(address) || "0:0:0:0:0:0:0:1".equals(address) || "::1".equals(address);
    }
}
