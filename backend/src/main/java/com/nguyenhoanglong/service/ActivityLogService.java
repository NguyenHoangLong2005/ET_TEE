package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.ActivityLog;
import com.nguyenhoanglong.repository.ActivityLogRepository;
import com.nguyenhoanglong.util.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.concurrent.Executor;

/**
 * Single writer for the audit trail (activity_logs).
 *
 * Every row is enriched with what the current request can tell us - real client IP,
 * user agent, HTTP method/path, request id and the authenticated actor - so callers only
 * have to say WHAT happened. The enrichment runs on the calling thread; only the DB write
 * of {@link #recordAsync(ActivityLog)} is deferred.
 */
@Service
public class ActivityLogService {

    private static final Logger log = LoggerFactory.getLogger(ActivityLogService.class);

    public static final String REQUEST_ID_ATTR = "auditRequestId";
    public static final String RESULT_SUCCESS = "SUCCESS";
    public static final String RESULT_FAILURE = "FAILURE";

    private final ActivityLogRepository activityLogRepository;
    private final Executor taskExecutor;

    public ActivityLogService(ActivityLogRepository activityLogRepository,
                              @Qualifier("taskExecutor") Executor taskExecutor) {
        this.activityLogRepository = activityLogRepository;
        this.taskExecutor = taskExecutor;
    }

    /** Backward compatible entry point used across the code base. */
    public ActivityLog log(String userId, String action, String targetEntity, String targetId, String description, String ipAddress) {
        ActivityLog activityLog = new ActivityLog();
        activityLog.setUserId(userId != null ? userId : "SYSTEM");
        activityLog.setAction(action);
        activityLog.setTargetEntity(targetEntity);
        activityLog.setTargetId(targetId);
        activityLog.setDescription(description);
        activityLog.setIpAddress(ipAddress);
        return record(activityLog);
    }

    /** Enriches and persists synchronously. Never throws: auditing must not break the request. */
    public ActivityLog record(ActivityLog entry) {
        try {
            enrich(entry);
            return activityLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Failed to persist activity log: {}", e.getMessage(), e);
            return null;
        }
    }

    /** Enriches on the caller's thread, then writes on the async executor. */
    public void recordAsync(ActivityLog entry) {
        try {
            enrich(entry);
        } catch (Exception e) {
            log.warn("Failed to enrich activity log: {}", e.getMessage());
        }
        try {
            taskExecutor.execute(() -> {
                try {
                    activityLogRepository.save(entry);
                } catch (Exception e) {
                    log.error("Failed to persist activity log: {}", e.getMessage(), e);
                }
            });
        } catch (Exception e) {
            log.error("Failed to queue activity log: {}", e.getMessage(), e);
        }
    }

    private void enrich(ActivityLog entry) {
        if (entry.getCreatedAt() == null) entry.setCreatedAt(LocalDateTime.now());

        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        if (attrs instanceof ServletRequestAttributes servletAttrs) {
            HttpServletRequest request = servletAttrs.getRequest();
            String ip = entry.getIpAddress();
            if (ip == null || ip.isBlank() || ClientIpResolver.isLoopback(ip)) {
                String resolved = ClientIpResolver.resolve(request);
                if (resolved != null) entry.setIpAddress(resolved);
            }
            if (entry.getUserAgent() == null) entry.setUserAgent(truncate(request.getHeader("User-Agent"), 500));
            if (entry.getHttpMethod() == null) entry.setHttpMethod(request.getMethod());
            if (entry.getRequestPath() == null) entry.setRequestPath(truncate(request.getRequestURI(), 500));
            if (entry.getRequestId() == null) {
                Object rid = request.getAttribute(REQUEST_ID_ATTR);
                if (rid != null) entry.setRequestId(rid.toString());
            }
        }
        if (entry.getIpAddress() == null || entry.getIpAddress().isBlank()) entry.setIpAddress("unknown");

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            if (entry.getActorEmail() == null && auth.getName() != null && auth.getName().contains("@")) {
                entry.setActorEmail(auth.getName());
            }
            if (entry.getActorRole() == null) {
                for (GrantedAuthority authority : auth.getAuthorities()) {
                    String name = authority.getAuthority();
                    if (name != null && name.startsWith("ROLE_")) {
                        entry.setActorRole(name.substring(5));
                        break;
                    }
                }
            }
        }
        if (entry.getResult() == null) entry.setResult(RESULT_SUCCESS);
    }

    public static String truncate(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }
}
