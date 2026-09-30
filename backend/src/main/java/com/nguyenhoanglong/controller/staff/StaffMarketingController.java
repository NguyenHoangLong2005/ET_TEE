package com.nguyenhoanglong.controller.staff;

import com.nguyenhoanglong.constant.PermissionConstants;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.service.MarketingService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/staff/marketing")
public class StaffMarketingController {

    @Autowired
    private MarketingService marketingService;

    private String getCurrentUserIdentifier() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return "marketing@et.tee";
        }
        return auth.getName();
    }

    // ═════════════════════════════════════════════════════════════════════
    // CAMPAIGNS
    // ═════════════════════════════════════════════════════════════════════

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_CAMPAIGN_PROMO)")
    @GetMapping("/campaigns")
    public ResponseEntity<List<Campaign>> listCampaigns(@RequestParam(required = false) Integer size) {
        List<Campaign> campaigns = marketingService.getAllCampaigns();
        if (size != null && size > 0 && campaigns.size() > size) {
            campaigns = campaigns.subList(0, size);
        }
        return ResponseEntity.ok(campaigns);
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_CAMPAIGN_PROMO)")
    @GetMapping("/campaigns/{id}")
    public ResponseEntity<Campaign> getCampaign(@PathVariable Long id) {
        Campaign campaign = marketingService.getCampaign(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chiến dịch"));
        return ResponseEntity.ok(campaign);
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_CAMPAIGN_PROMO)")
    @PostMapping("/campaigns")
    public ResponseEntity<Campaign> createCampaign(@Valid @RequestBody Campaign campaign) {
        Campaign created = marketingService.createCampaign(campaign, getCurrentUserIdentifier());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_CAMPAIGN_PROMO)")
    @PutMapping("/campaigns/{id}")
    public ResponseEntity<Campaign> updateCampaign(@PathVariable Long id, @Valid @RequestBody Campaign campaign) {
        Campaign updated = marketingService.updateCampaign(id, campaign, getCurrentUserIdentifier());
        return ResponseEntity.ok(updated);
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_CAMPAIGN_PROMO)")
    @RequestMapping(value = "/campaigns/{id}/status", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public ResponseEntity<Campaign> updateCampaignStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        Campaign updated = marketingService.updateCampaignStatus(id, status, getCurrentUserIdentifier());
        return ResponseEntity.ok(updated);
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_CAMPAIGN_PROMO)")
    @DeleteMapping("/campaigns/{id}")
    public ResponseEntity<Map<String, Object>> deleteCampaign(@PathVariable Long id) {
        marketingService.deleteCampaign(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa chiến dịch"));
    }

    // ═════════════════════════════════════════════════════════════════════
    // VOUCHERS
    // ═════════════════════════════════════════════════════════════════════

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_CAMPAIGN_PROMO)")
    @GetMapping("/vouchers")
    public ResponseEntity<List<Voucher>> listVouchers() {
        return ResponseEntity.ok(marketingService.getAllVouchers());
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_CAMPAIGN_PROMO)")
    @PostMapping("/vouchers")
    public ResponseEntity<Voucher> createVoucher(@Valid @RequestBody Voucher voucher) {
        Voucher created = marketingService.createVoucher(voucher, getCurrentUserIdentifier());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_CAMPAIGN_PROMO)")
    @PutMapping("/vouchers/{id}")
    public ResponseEntity<Voucher> updateVoucher(@PathVariable Long id, @Valid @RequestBody Voucher voucher) {
        Voucher updated = marketingService.updateVoucher(id, voucher, getCurrentUserIdentifier());
        return ResponseEntity.ok(updated);
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_CAMPAIGN_PROMO)")
    @RequestMapping(value = "/vouchers/{id}/status", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public ResponseEntity<Voucher> updateVoucherStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        Voucher updated = marketingService.updateVoucherStatus(id, status, getCurrentUserIdentifier());
        return ResponseEntity.ok(updated);
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_CAMPAIGN_PROMO)")
    @DeleteMapping("/vouchers/{id}")
    public ResponseEntity<Map<String, Object>> deleteVoucher(@PathVariable Long id) {
        marketingService.deleteVoucher(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa voucher"));
    }

    // ═════════════════════════════════════════════════════════════════════
    // BANNERS
    // ═════════════════════════════════════════════════════════════════════

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_BANNER_LANDING)")
    @GetMapping("/banners")
    public ResponseEntity<List<Banner>> listBanners() {
        return ResponseEntity.ok(marketingService.getAllBanners());
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_BANNER_LANDING)")
    @PostMapping("/banners")
    public ResponseEntity<Banner> createBanner(@Valid @RequestBody Banner banner) {
        Banner created = marketingService.createBanner(banner, getCurrentUserIdentifier());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_BANNER_LANDING)")
    @PutMapping("/banners/{id}")
    public ResponseEntity<Banner> updateBanner(@PathVariable Long id, @Valid @RequestBody Banner banner) {
        Banner updated = marketingService.updateBanner(id, banner, getCurrentUserIdentifier());
        return ResponseEntity.ok(updated);
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_BANNER_LANDING)")
    @RequestMapping(value = "/banners/{id}/status", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public ResponseEntity<Banner> updateBannerStatus(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String status = "ACTIVE";
        if (body.containsKey("status") && body.get("status") != null) {
            status = body.get("status").toString();
        } else if (body.containsKey("isActive")) {
            boolean active = Boolean.parseBoolean(body.get("isActive").toString());
            status = active ? "ACTIVE" : "INACTIVE";
        }
        Banner updated = marketingService.updateBannerStatus(id, status, getCurrentUserIdentifier());
        return ResponseEntity.ok(updated);
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_BANNER_LANDING)")
    @DeleteMapping("/banners/{id}")
    public ResponseEntity<Map<String, Object>> deleteBanner(@PathVariable Long id) {
        marketingService.deleteBanner(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa banner"));
    }

    // ═════════════════════════════════════════════════════════════════════
    // PRODUCT PLACEMENTS
    // ═════════════════════════════════════════════════════════════════════

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_PRODUCT_PLACEMENT)")
    @GetMapping("/placements")
    public ResponseEntity<List<Map<String, Object>>> getPlacements(
            @RequestParam(required = false) String section) {
        List<ProductPlacement> placements = (section != null && !section.trim().isEmpty())
                ? marketingService.getPlacementsBySection(section.trim())
                : marketingService.getAllPlacements();

        List<Map<String, Object>> response = placements.stream()
                .map(marketingService::mapPlacementWithProduct)
                .toList();

        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_PRODUCT_PLACEMENT)")
    @PostMapping("/placements")
    public ResponseEntity<Map<String, Object>> createPlacement(@RequestBody Map<String, Object> body) {
        ProductPlacement p = new ProductPlacement();
        String section = body.get("section") != null ? body.get("section").toString() : (String) body.get("placementKey");
        if (section == null || section.isBlank()) section = "HOMEPAGE_FEATURED";
        p.setPlacementKey(section);

        if (body.get("productId") == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "productId không được để trống");
        }
        p.setProductId(Long.parseLong(body.get("productId").toString()));

        if (body.get("displayOrder") != null) {
            p.setPosition(Integer.parseInt(body.get("displayOrder").toString()));
        } else if (body.get("position") != null) {
            p.setPosition(Integer.parseInt(body.get("position").toString()));
        }

        ProductPlacement created = marketingService.createPlacement(p, getCurrentUserIdentifier());
        return ResponseEntity.status(HttpStatus.CREATED).body(marketingService.mapPlacementWithProduct(created));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_PRODUCT_PLACEMENT)")
    @PutMapping("/placements/reorder")
    public ResponseEntity<Map<String, Object>> reorderPlacements(@RequestBody Map<String, Object> body) {
        String section = (String) body.get("section");
        @SuppressWarnings("unchecked")
        List<Object> rawIds = (List<Object>) body.get("orderedIds");
        if (rawIds != null) {
            List<Long> ids = rawIds.stream()
                    .map(id -> Long.parseLong(id.toString()))
                    .toList();
            marketingService.reorderPlacements(section, ids);
        }
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã cập nhật thứ tự"));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_PRODUCT_PLACEMENT)")
    @DeleteMapping("/placements/{id}")
    public ResponseEntity<Map<String, Object>> deletePlacement(@PathVariable Long id) {
        marketingService.deletePlacement(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa vị trí sản phẩm"));
    }

    // ═════════════════════════════════════════════════════════════════════
    // MARKETING POSTS
    // ═════════════════════════════════════════════════════════════════════

    @PreAuthorize("hasAnyAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_BANNER_LANDING, T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_CAMPAIGN_PROMO)")
    @GetMapping("/posts")
    public ResponseEntity<List<MarketingPost>> getPosts(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(marketingService.getAllPosts(status, search));
    }

    @PreAuthorize("hasAnyAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_BANNER_LANDING, T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_CAMPAIGN_PROMO)")
    @GetMapping("/posts/{id}")
    public ResponseEntity<MarketingPost> getPostById(@PathVariable Long id) {
        MarketingPost post = marketingService.getPostById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết"));
        return ResponseEntity.ok(post);
    }

    @PreAuthorize("hasAnyAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_BANNER_LANDING, T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_CAMPAIGN_PROMO)")
    @PostMapping("/posts")
    public ResponseEntity<MarketingPost> createPost(@Valid @RequestBody MarketingPost post) {
        MarketingPost created = marketingService.createPost(post, getCurrentUserIdentifier());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PreAuthorize("hasAnyAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_BANNER_LANDING, T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_CAMPAIGN_PROMO)")
    @PutMapping("/posts/{id}")
    public ResponseEntity<MarketingPost> updatePost(@PathVariable Long id, @Valid @RequestBody MarketingPost post) {
        MarketingPost updated = marketingService.updatePost(id, post, getCurrentUserIdentifier());
        return ResponseEntity.ok(updated);
    }

    @PreAuthorize("hasAnyAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_BANNER_LANDING, T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_CAMPAIGN_PROMO)")
    @DeleteMapping("/posts/{id}")
    public ResponseEntity<Map<String, Object>> deletePost(@PathVariable Long id) {
        marketingService.deletePost(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa bài viết"));
    }

    // ═════════════════════════════════════════════════════════════════════
    // ANALYTICS
    // ═════════════════════════════════════════════════════════════════════

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).VIEW_CAMPAIGN_ANALYTICS)")
    @GetMapping("/analytics/overview")
    public ResponseEntity<Map<String, Object>> getAnalyticsOverview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime since) {
        return ResponseEntity.ok(marketingService.getAnalyticsOverview(since));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).VIEW_CAMPAIGN_ANALYTICS)")
    @GetMapping("/analytics/campaigns/{id}")
    public ResponseEntity<Map<String, Object>> getCampaignAnalytics(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime since) {
        return ResponseEntity.ok(marketingService.getCampaignAnalytics(id, since));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).VIEW_CAMPAIGN_ANALYTICS)")
    @GetMapping("/analytics/banners/{id}")
    public ResponseEntity<Map<String, Object>> getBannerAnalytics(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime since) {
        return ResponseEntity.ok(marketingService.getBannerAnalytics(id, since));
    }

    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).VIEW_CAMPAIGN_ANALYTICS)")
    @GetMapping("/analytics/vouchers/{id}")
    public ResponseEntity<Map<String, Object>> getVoucherAnalytics(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime since) {
        return ResponseEntity.ok(marketingService.getVoucherAnalytics(id, since));
    }
}
