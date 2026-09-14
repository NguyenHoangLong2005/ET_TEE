package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.UserRepository;
import com.nguyenhoanglong.service.MarketingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/marketing")
public class MarketingController {

    @Autowired
    private MarketingService marketingService;

    @Autowired
    private UserRepository userRepository;

    private String getCurrentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName().equals("anonymousUser")) {
            return null;
        }
        return auth.getName();
    }

    private String getCurrentUserIdentifier() {
        // Returns user email when logged in (used as audit actor)
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName().equals("anonymousUser")) {
            return null;
        }
        return auth.getName();
    }

    // ═════════════════════════════════════════════════════════════════════
    // PUBLIC — Banners
    // ═════════════════════════════════════════════════════════════════════

    @GetMapping("/banners")
    public ResponseEntity<Map<String, Object>> getPublicBanners(
            @RequestParam(required = false) String position) {
        List<Banner> banners = (position == null || position.isEmpty())
                ? marketingService.getPublicBanners()
                : marketingService.getPublicBannersByPosition(position);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", banners);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/banners/{position}")
    public ResponseEntity<Map<String, Object>> getBannersByPosition(@PathVariable String position) {
        return getPublicBanners(position);
    }

    // ═════════════════════════════════════════════════════════════════════
    // PUBLIC — Vouchers
    // ═════════════════════════════════════════════════════════════════════

    @GetMapping("/vouchers")
    public ResponseEntity<Map<String, Object>> getActiveVouchers() {
        List<Voucher> vouchers = marketingService.getActiveVouchers();
        List<Map<String, Object>> publicVouchers = vouchers.stream().map(v -> {
            Map<String, Object> pub = new HashMap<>();
            pub.put("id", v.getId());
            pub.put("code", v.getCode());
            pub.put("name", v.getName());
            pub.put("description", v.getDescription());
            pub.put("type", v.getType());
            pub.put("discountValue", v.getDiscountValue());
            pub.put("minOrderAmount", v.getMinOrderAmount());
            pub.put("maxDiscountAmount", v.getMaxDiscountAmount());
            pub.put("freeShipping", v.getFreeShipping());
            pub.put("targetGroup", v.getTargetGroup());
            pub.put("startDate", v.getStartDate());
            pub.put("endDate", v.getEndDate());
            return pub;
        }).toList();
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", publicVouchers);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/vouchers/validate")
    public ResponseEntity<Map<String, Object>> validateVoucher(@RequestBody Map<String, Object> body) {
        try {
            String code = (String) body.get("code");
            BigDecimal subtotal = body.get("subtotal") != null
                    ? new BigDecimal(body.get("subtotal").toString()) : BigDecimal.ZERO;
            String userId = getCurrentUserId();
            boolean isNewCustomer = Boolean.TRUE.equals(body.get("isNewCustomer"));
            Voucher voucher = marketingService.validateVoucher(code, subtotal, userId, isNewCustomer);
            Map<String, Object> discount = marketingService.computeDiscount(voucher, subtotal);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", discount);
            return ResponseEntity.ok(response);
        } catch (ResponseStatusException ex) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", ex.getReason());
            return ResponseEntity.status(ex.getStatusCode()).body(response);
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    // PUBLIC — Placements & Product Placement homepage fetch
    // ═════════════════════════════════════════════════════════════════════

    @GetMapping("/public/placements")
    public ResponseEntity<Map<String, Object>> publicPlacements(
            @RequestParam(required = false) String key) {
        List<ProductPlacement> data;
        if (key == null || key.isEmpty()) {
            data = marketingService.getAllPlacements();
        } else {
            data = marketingService.getActivePlacementsByKey(key);
        }
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", data);
        return ResponseEntity.ok(response);
    }

    // ═════════════════════════════════════════════════════════════════════
    // PUBLIC — Track marketing event (impression/click/conversion)
    // ═════════════════════════════════════════════════════════════════════

    @PostMapping("/public/track")
    public ResponseEntity<Map<String, Object>> publicTrack(@RequestBody Map<String, Object> body) {
        try {
            Long campaignId = body.get("campaignId") != null ? Long.parseLong(body.get("campaignId").toString()) : null;
            String eventType = (String) body.get("eventType");
            Long bannerId = body.get("bannerId") != null ? Long.parseLong(body.get("bannerId").toString()) : null;
            Long voucherId = body.get("voucherId") != null ? Long.parseLong(body.get("voucherId").toString()) : null;
            String productId = body.get("productId") != null ? body.get("productId").toString() : null;
            String sessionId = (String) body.get("sessionId");
            String userId = getCurrentUserId();
            Long orderId = body.get("orderId") != null ? Long.parseLong(body.get("orderId").toString()) : null;
            BigDecimal revenue = body.get("revenue") != null ? new BigDecimal(body.get("revenue").toString()) : null;
            marketingService.trackEvent(campaignId, eventType, bannerId, voucherId, productId, sessionId, userId, orderId, revenue);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            return ResponseEntity.ok(response);
        } catch (ResponseStatusException ex) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", ex.getReason());
            return ResponseEntity.status(ex.getStatusCode()).body(response);
        } catch (Exception ex) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Không thể ghi sự kiện: " + ex.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    // ADMIN — Banners
    // ═════════════════════════════════════════════════════════════════════

    @GetMapping("/admin/banners")
    public ResponseEntity<Map<String, Object>> listBanners() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", marketingService.getAllBanners());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/admin/banners")
    public ResponseEntity<Map<String, Object>> createBanner(@RequestBody Banner banner) {
        Banner created = marketingService.createBanner(banner, getCurrentUserIdentifier());
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Tạo banner thành công");
        response.put("data", created);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/admin/banners/{id}")
    public ResponseEntity<Map<String, Object>> updateBanner(@PathVariable Long id, @RequestBody Banner banner) {
        Banner updated = marketingService.updateBanner(id, banner, getCurrentUserIdentifier());
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Cập nhật banner thành công");
        response.put("data", updated);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/admin/banners/{id}/status")
    public ResponseEntity<Map<String, Object>> patchBannerStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Banner updated = marketingService.updateBannerStatus(id, body.get("status"), getCurrentUserIdentifier());
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Đã cập nhật trạng thái");
        response.put("data", updated);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/admin/banners/{id}")
    public ResponseEntity<Map<String, Object>> deleteBanner(@PathVariable Long id) {
        marketingService.deleteBanner(id);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Xóa banner thành công");
        return ResponseEntity.ok(response);
    }

    // ═════════════════════════════════════════════════════════════════════
    // ADMIN — Vouchers
    // ═════════════════════════════════════════════════════════════════════

    @GetMapping("/admin/vouchers")
    public ResponseEntity<Map<String, Object>> listVouchers() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", marketingService.getAllVouchers());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/admin/vouchers")
    public ResponseEntity<Map<String, Object>> createVoucher(@RequestBody Voucher voucher) {
        Voucher created = marketingService.createVoucher(voucher, getCurrentUserIdentifier());
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Tạo voucher thành công");
        response.put("data", created);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/admin/vouchers/{id}")
    public ResponseEntity<Map<String, Object>> updateVoucher(@PathVariable Long id, @RequestBody Voucher voucher) {
        Voucher updated = marketingService.updateVoucher(id, voucher, getCurrentUserIdentifier());
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Cập nhật voucher thành công");
        response.put("data", updated);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/admin/vouchers/{id}/status")
    public ResponseEntity<Map<String, Object>> patchVoucherStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Voucher updated = marketingService.updateVoucherStatus(id, body.get("status"), getCurrentUserIdentifier());
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Đã cập nhật trạng thái");
        response.put("data", updated);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/admin/vouchers/{id}")
    public ResponseEntity<Map<String, Object>> deleteVoucher(@PathVariable Long id) {
        marketingService.deleteVoucher(id);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Xóa voucher thành công");
        return ResponseEntity.ok(response);
    }

    // ═════════════════════════════════════════════════════════════════════
    // ADMIN — Campaigns
    // ═════════════════════════════════════════════════════════════════════

    @GetMapping("/admin/campaigns")
    public ResponseEntity<Map<String, Object>> listCampaigns() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", marketingService.getAllCampaigns());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/admin/campaigns/{id}")
    public ResponseEntity<Map<String, Object>> getCampaign(@PathVariable Long id) {
        Campaign c = marketingService.getCampaign(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign không tồn tại"));
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", c);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/admin/campaigns")
    public ResponseEntity<Map<String, Object>> createCampaign(@RequestBody Campaign campaign) {
        Campaign created = marketingService.createCampaign(campaign, getCurrentUserIdentifier());
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Tạo campaign thành công");
        response.put("data", created);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/admin/campaigns/{id}")
    public ResponseEntity<Map<String, Object>> updateCampaign(@PathVariable Long id, @RequestBody Campaign campaign) {
        Campaign updated = marketingService.updateCampaign(id, campaign, getCurrentUserIdentifier());
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Cập nhật campaign thành công");
        response.put("data", updated);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/admin/campaigns/{id}/status")
    public ResponseEntity<Map<String, Object>> patchCampaignStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Campaign updated = marketingService.updateCampaignStatus(id, body.get("status"), getCurrentUserIdentifier());
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Đã cập nhật trạng thái");
        response.put("data", updated);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/admin/campaigns/{id}")
    public ResponseEntity<Map<String, Object>> deleteCampaign(@PathVariable Long id) {
        marketingService.deleteCampaign(id);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Xóa campaign thành công");
        return ResponseEntity.ok(response);
    }

    // ═════════════════════════════════════════════════════════════════════
    // ADMIN — Placements
    // ═════════════════════════════════════════════════════════════════════

    @GetMapping("/admin/placements")
    public ResponseEntity<Map<String, Object>> listPlacements() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", marketingService.getAllPlacements());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/admin/placements")
    public ResponseEntity<Map<String, Object>> createPlacement(@RequestBody ProductPlacement placement) {
        ProductPlacement created = marketingService.createPlacement(placement, getCurrentUserIdentifier());
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Tạo placement thành công");
        response.put("data", created);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/admin/placements/{id}")
    public ResponseEntity<Map<String, Object>> updatePlacement(@PathVariable Long id, @RequestBody ProductPlacement placement) {
        ProductPlacement updated = marketingService.updatePlacement(id, placement, getCurrentUserIdentifier());
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Cập nhật placement thành công");
        response.put("data", updated);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/admin/placements/{id}")
    public ResponseEntity<Map<String, Object>> deletePlacement(@PathVariable Long id) {
        marketingService.deletePlacement(id);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Xóa placement thành công");
        return ResponseEntity.ok(response);
    }

    // ═════════════════════════════════════════════════════════════════════
    // ADMIN — Analytics
    // ═════════════════════════════════════════════════════════════════════

    @GetMapping("/admin/analytics/overview")
    public ResponseEntity<Map<String, Object>> analyticsOverview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime since) {
        Map<String, Object> data = marketingService.getAnalyticsOverview(since);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", data);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/admin/analytics/campaigns/{id}")
    public ResponseEntity<Map<String, Object>> campaignAnalytics(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime since) {
        Map<String, Object> data = marketingService.getCampaignAnalytics(id, since);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", data);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/admin/analytics/banners/{id}")
    public ResponseEntity<Map<String, Object>> bannerAnalytics(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime since) {
        Map<String, Object> data = marketingService.getBannerAnalytics(id, since);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", data);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/admin/analytics/vouchers/{id}")
    public ResponseEntity<Map<String, Object>> voucherAnalytics(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime since) {
        Map<String, Object> data = marketingService.getVoucherAnalytics(id, since);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", data);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/admin/track")
    public ResponseEntity<Map<String, Object>> adminTrack(@RequestBody Map<String, Object> body) {
        Long campaignId = body.get("campaignId") != null ? Long.parseLong(body.get("campaignId").toString()) : null;
        String eventType = (String) body.get("eventType");
        Long bannerId = body.get("bannerId") != null ? Long.parseLong(body.get("bannerId").toString()) : null;
        Long voucherId = body.get("voucherId") != null ? Long.parseLong(body.get("voucherId").toString()) : null;
        String productId = body.get("productId") != null ? body.get("productId").toString() : null;
        String guestToken = (String) body.get("guestToken");
        marketingService.trackEvent(campaignId, eventType, bannerId, voucherId, productId, guestToken,
                getCurrentUserId(), null, null);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        return ResponseEntity.ok(response);
    }
}
