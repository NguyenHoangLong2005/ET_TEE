package com.nguyenhoanglong.config;

import com.nguyenhoanglong.entity.ActivityLog;
import com.nguyenhoanglong.service.ActivityLogService;
import com.nguyenhoanglong.util.ClientIpResolver;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Records every state-changing request (POST/PUT/PATCH/DELETE) made in the admin, staff,
 * store-owner and account areas: who, from where, what path, and whether it succeeded.
 *
 * Runs after Spring Security (lowest precedence) so the authenticated actor is available.
 * Request bodies and query strings are deliberately NOT stored - they can carry passwords
 * or personal data. Business-level entries written by services during the same request share
 * the same request id, so the two views can be joined.
 */
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class AuditTrailFilter extends OncePerRequestFilter {

    private static final Set<String> WRITE_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");
    private static final List<String> AUDITED_PREFIXES =
            List.of("/api/admin/", "/api/staff/", "/api/store-owner/", "/api/account/");
    private static final Pattern ID_SEGMENT = Pattern.compile("\\d+|[0-9a-fA-F]{8}-[0-9a-fA-F-]{27}");

    private final ActivityLogService activityLogService;

    public AuditTrailFilter(ActivityLogService activityLogService) {
        this.activityLogService = activityLogService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!WRITE_METHODS.contains(request.getMethod())) return true;
        String path = request.getRequestURI();
        for (String prefix : AUDITED_PREFIXES) {
            if (path.startsWith(prefix)) return false;
        }
        return true;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String requestId = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        request.setAttribute(ActivityLogService.REQUEST_ID_ATTR, requestId);
        response.setHeader("X-Request-Id", requestId);

        long startedAt = System.nanoTime();
        int status = 500; // stays 500 if the chain throws
        try {
            chain.doFilter(request, response);
            status = response.getStatus();
        } finally {
            try {
                write(request, status, (int) ((System.nanoTime() - startedAt) / 1_000_000L), requestId);
            } catch (Exception ignored) {
                // never let auditing break the response
            }
        }
    }

    private void write(HttpServletRequest request, int status, int durationMs, String requestId) {
        String path = request.getRequestURI();
        String method = request.getMethod();

        String prefix = AUDITED_PREFIXES.stream().filter(path::startsWith).findFirst().orElse("/api/");
        String[] segments = path.substring(prefix.length()).split("/");
        String entity = segments.length > 0 && !segments[0].isEmpty() ? segments[0] : "api";
        String targetId = null;
        for (String segment : segments) {
            if (ID_SEGMENT.matcher(segment).matches()) {
                targetId = segment;
                break;
            }
        }

        ActivityLog entry = new ActivityLog();
        entry.setAction("API_" + method);
        entry.setTargetEntity(entity);
        entry.setTargetId(targetId);
        entry.setHttpMethod(method);
        entry.setRequestPath(ActivityLogService.truncate(path, 500));
        entry.setStatusCode(status);
        entry.setDurationMs(durationMs);
        entry.setRequestId(requestId);
        entry.setResult(status < 400 ? ActivityLogService.RESULT_SUCCESS : ActivityLogService.RESULT_FAILURE);
        entry.setIpAddress(ClientIpResolver.resolve(request));
        entry.setUserAgent(ActivityLogService.truncate(request.getHeader("User-Agent"), 500));
        entry.setDescription(method + " " + path + " → " + status + " (" + durationMs + " ms)");
        // userId, actor e-mail and role are filled from the security context by the service.
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        entry.setUserId(auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())
                ? auth.getName() : "ANONYMOUS");
        activityLogService.recordAsync(entry);
    }
}
