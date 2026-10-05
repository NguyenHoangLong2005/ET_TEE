package com.nguyenhoanglong.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    // NOTE: This ConcurrentHashMap approach works correctly ONLY for a single-instance deployment.
    // If scaled horizontally (multiple pods), rate limits will be per-instance and thus less effective.
    // For a distributed setup, Bucket4j with Redis or a similar external cache should be used.
    private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> registerBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> forgotPasswordBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> checkEmailBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> behaviorEventBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> imageSearchBuckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();
        String ipAddress = resolveClientIp(request);

        if (uri.equals("/api/auth/login") && request.getMethod().equalsIgnoreCase("POST")) {
            Bucket bucket = loginBuckets.computeIfAbsent(ipAddress, k -> createLoginBucket());
            if (!bucket.tryConsume(1)) {
                sendRateLimitResponse(response, "Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau.");
                return;
            }
        } else if (uri.equals("/api/auth/register") && request.getMethod().equalsIgnoreCase("POST")) {
            Bucket bucket = registerBuckets.computeIfAbsent(ipAddress, k -> createRegisterBucket());
            if (!bucket.tryConsume(1)) {
                sendRateLimitResponse(response, "Quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau.");
                return;
            }
        } else if (uri.equals("/api/auth/forgot-password") && request.getMethod().equalsIgnoreCase("POST")) {
            Bucket bucket = forgotPasswordBuckets.computeIfAbsent(ipAddress, k -> createForgotPasswordBucket());
            if (!bucket.tryConsume(1)) {
                sendRateLimitResponse(response, "Quá nhiều yêu cầu quên mật khẩu. Vui lòng thử lại sau.");
                return;
            }
        } else if (uri.equals("/api/auth/check-email") && request.getMethod().equalsIgnoreCase("GET")) {
            Bucket bucket = checkEmailBuckets.computeIfAbsent(ipAddress, k -> createCheckEmailBucket());
            if (!bucket.tryConsume(1)) {
                sendRateLimitResponse(response, "Quá nhiều yêu cầu kiểm tra email. Vui lòng thử lại sau.");
                return;
            }
        } else if (uri.equals("/api/search/image") && request.getMethod().equalsIgnoreCase("POST")) {
            Bucket bucket = imageSearchBuckets.computeIfAbsent(ipAddress, k -> createImageSearchBucket());
            if (!bucket.tryConsume(1)) {
                sendRateLimitResponse(response, "Quá nhiều lượt tìm bằng ảnh. Vui lòng thử lại sau.");
                return;
            }
        } else if (uri.equals("/api/events") && request.getMethod().equalsIgnoreCase("POST")) {
            Bucket bucket = behaviorEventBuckets.computeIfAbsent(ipAddress, k -> createBehaviorEventBucket());
            if (!bucket.tryConsume(1)) {
                sendRateLimitResponse(response, "Quá nhiều sự kiện. Vui lòng thử lại sau.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private Bucket createLoginBucket() {
        // 10 requests per minute
        Bandwidth limit = Bandwidth.classic(10, Refill.greedy(10, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket createRegisterBucket() {
        // 5 requests per hour
        Bandwidth limit = Bandwidth.classic(5, Refill.greedy(5, Duration.ofHours(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket createForgotPasswordBucket() {
        // 3 requests per hour
        Bandwidth limit = Bandwidth.classic(3, Refill.greedy(3, Duration.ofHours(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket createImageSearchBucket() {
        // 20 photos per minute: each one costs a CLIP image encoding on the embedder
        Bandwidth limit = Bandwidth.classic(20, Refill.greedy(20, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket createBehaviorEventBucket() {
        // 120 page views per minute: far above real browsing, stops a script flooding the training data
        Bandwidth limit = Bandwidth.classic(120, Refill.greedy(120, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket createCheckEmailBucket() {
        // 10 requests per minute
        Bandwidth limit = Bandwidth.classic(10, Refill.greedy(10, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    /**
     * The Next.js server proxies every /api/** request to this backend, so
     * request.getRemoteAddr() is always the Next server's own address and
     * every visitor to the site shared one login/register/forgot-password
     * bucket. Only trust the X-Forwarded-For header when the direct TCP peer
     * is our own reverse proxy (loopback) - otherwise a direct caller could
     * spoof the header to dodge the limit entirely.
     */
    private String resolveClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        boolean fromTrustedProxy = "127.0.0.1".equals(remoteAddr) || "0:0:0:0:0:0:0:1".equals(remoteAddr) || "::1".equals(remoteAddr);
        if (fromTrustedProxy) {
            String forwardedFor = request.getHeader("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank()) {
                return forwardedFor.split(",")[0].trim();
            }
        }
        return remoteAddr;
    }

    private void sendRateLimitResponse(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"error\": \"" + message + "\"}");
    }
}
