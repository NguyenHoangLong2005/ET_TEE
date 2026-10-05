package com.nguyenhoanglong.controller.staff;

import com.nguyenhoanglong.dto.ApiResponse;
import com.nguyenhoanglong.entity.EmailCampaign;
import com.nguyenhoanglong.repository.MarketingSubscriptionRepository;
import com.nguyenhoanglong.service.EmailCampaignService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

/** Marketing staff: email campaigns to consenting customers, by audience segment. */
@RestController
@RequestMapping("/api/staff/marketing/email-campaigns")
public class StaffEmailCampaignController {

    private final EmailCampaignService service;
    private final MarketingSubscriptionRepository subscriptions;

    public StaffEmailCampaignController(EmailCampaignService service, MarketingSubscriptionRepository subscriptions) {
        this.service = service;
        this.subscriptions = subscriptions;
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).VIEW_CAMPAIGN_ANALYTICS)"
            + " or hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_CAMPAIGN_PROMO)")
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> list() {
        List<Map<String, String>> segments = new ArrayList<>();
        for (var s : EmailCampaignService.Segment.values()) segments.add(Map.of("id", s.name(), "label", s.label));
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "campaigns", service.list(),
                "segments", segments,
                "subscribers", subscriptions.countByStatus("SUBSCRIBED"))));
    }

    /** How many people a segment reaches right now (consent is re-checked again at send time). */
    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_CAMPAIGN_PROMO)")
    @GetMapping("/audience")
    public ResponseEntity<ApiResponse<Map<String, Object>>> audience(@RequestParam String segment) {
        EmailCampaignService.Segment s;
        try {
            s = EmailCampaignService.Segment.valueOf(segment);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nhóm khách không hợp lệ");
        }
        return ResponseEntity.ok(ApiResponse.success(Map.of("segment", s.name(), "count", service.audience(s).size())));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_CAMPAIGN_PROMO)")
    @PostMapping
    public ResponseEntity<ApiResponse<EmailCampaign>> create(@RequestBody Map<String, Object> body) {
        Long voucherId = body.get("voucherId") == null || String.valueOf(body.get("voucherId")).isBlank()
                ? null : Long.valueOf(String.valueOf(body.get("voucherId")));
        EmailCampaign c = service.create((String) body.get("name"), (String) body.get("subject"), (String) body.get("intro"),
                voucherId, (String) body.get("segment"), SecurityContextHolder.getContext().getAuthentication().getName());
        return ResponseEntity.ok(ApiResponse.success(c));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_CAMPAIGN_PROMO)")
    @PostMapping("/{id}/send")
    public ResponseEntity<ApiResponse<EmailCampaign>> send(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(service.send(id)));
    }
}
