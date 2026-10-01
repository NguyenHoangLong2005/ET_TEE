package com.nguyenhoanglong.controller.admin;

import com.nguyenhoanglong.entity.ActivityLog;
import com.nguyenhoanglong.repository.ActivityLogRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/audit-logs")
public class AdminAuditLogController {

    /** Upper bound of one page; the CSV export asks for a large page, never for "everything". */
    private static final int MAX_PAGE_SIZE = 5000;

    private final ActivityLogRepository auditLogRepository;

    public AdminAuditLogController(ActivityLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).VIEW_AUDIT_LOG)")
    public ResponseEntity<?> getAuditLogs(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entity,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) String ip,
            @RequestParam(required = false) String result,
            @RequestParam(required = false) String method,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "desc") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Sort.Direction direction = "asc".equalsIgnoreCase(sort) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(direction, "createdAt").and(Sort.by(direction, "id")));

        Specification<ActivityLog> spec = buildSpec(search, action, entity, actor, ip, result, method, from, to);
        Page<ActivityLog> logPage = auditLogRepository.findAll(spec, pageable);

        // Failures inside the current filter, so the header can show "N thất bại" for the same selection.
        Specification<ActivityLog> failureSpec = spec.and((root, q, cb) -> cb.equal(root.get("result"), "FAILURE"));
        long failures = auditLogRepository.count(failureSpec);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("content", logPage.getContent());
        body.put("totalElements", logPage.getTotalElements());
        body.put("totalPages", logPage.getTotalPages());
        body.put("number", safePage);
        body.put("size", safeSize);
        body.put("summary", Map.of("total", logPage.getTotalElements(), "failures", failures));
        return ResponseEntity.ok(body);
    }

    /** Distinct values that exist in the trail, to populate the filter dropdowns. */
    @GetMapping("/facets")
    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).VIEW_AUDIT_LOG)")
    public ResponseEntity<?> getFacets() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("actions", auditLogRepository.findDistinctActions());
        body.put("entities", auditLogRepository.findDistinctTargetEntities());
        return ResponseEntity.ok(body);
    }

    private Specification<ActivityLog> buildSpec(String search, String action, String entity, String actor,
                                                 String ip, String result, String method, String from, String to) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (hasText(search)) {
                String kw = like(search);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("action")), kw),
                        cb.like(cb.lower(root.get("description")), kw),
                        cb.like(cb.lower(root.get("userId")), kw),
                        cb.like(cb.lower(root.get("actorEmail")), kw),
                        cb.like(cb.lower(root.get("targetEntity")), kw),
                        cb.like(cb.lower(root.get("targetId")), kw),
                        cb.like(cb.lower(root.get("requestPath")), kw),
                        cb.like(cb.lower(root.get("requestId")), kw),
                        cb.like(cb.lower(root.get("ipAddress")), kw)));
            }
            if (hasText(action)) {
                List<String> actions = Arrays.stream(action.split(","))
                        .map(String::trim).filter(s -> !s.isEmpty()).toList();
                if (!actions.isEmpty()) predicates.add(root.get("action").in(actions));
            }
            if (hasText(entity)) {
                predicates.add(cb.equal(root.get("targetEntity"), entity.trim()));
            }
            if (hasText(actor)) {
                String kw = like(actor);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("userId")), kw),
                        cb.like(cb.lower(root.get("actorEmail")), kw)));
            }
            if (hasText(ip)) {
                predicates.add(cb.like(cb.lower(root.get("ipAddress")), like(ip)));
            }
            if (hasText(result)) {
                predicates.add(cb.equal(root.get("result"), result.trim().toUpperCase()));
            }
            if (hasText(method)) {
                predicates.add(cb.equal(root.get("httpMethod"), method.trim().toUpperCase()));
            }
            LocalDate fromDate = parseDate(from);
            if (fromDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), fromDate.atStartOfDay()));
            }
            LocalDate toDate = parseDate(to);
            if (toDate != null) {
                // inclusive end date: everything before the start of the following day
                predicates.add(cb.lessThan(root.get("createdAt"), toDate.plusDays(1).atStartOfDay()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private static String like(String value) {
        return "%" + value.trim().toLowerCase() + "%";
    }

    private static LocalDate parseDate(String value) {
        if (!hasText(value)) return null;
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
