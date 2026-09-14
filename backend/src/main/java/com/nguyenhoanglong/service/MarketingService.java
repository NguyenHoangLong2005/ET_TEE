package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class MarketingService {

    @Autowired private BannerRepository bannerRepository;
    @Autowired private VoucherRepository voucherRepository;
    @Autowired private CampaignRepository campaignRepository;
    @Autowired private CampaignAnalyticsRepository analyticsRepository;
    @Autowired private ProductPlacementRepository placementRepository;
    @Autowired private VoucherRedemptionRepository redemptionRepository;
    @Autowired private ProductRepository productRepository;

    // ═════════════════════════════════════════════════════════════════════
    // BANNERS
    // ═════════════════════════════════════════════════════════════════════

    public List<Banner> getPublicBanners() {
        return bannerRepository.findAllActive(LocalDateTime.now());
    }

    public List<Banner> getPublicBannersByPosition(String position) {
        return bannerRepository.findActiveByPosition(position, LocalDateTime.now());
    }

    public List<Banner> getAllBanners() {
        return bannerRepository.findAll();
    }

    @Transactional
    public Banner createBanner(Banner banner, String createdBy) {
        if (banner.getTitle() == null || banner.getTitle().trim().isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tiêu đề banner không được trống");
        if (banner.getImageUrl() == null || banner.getImageUrl().trim().isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL ảnh không được trống");
        if (banner.getPosition() == null || banner.getPosition().trim().isEmpty())
            banner.setPosition("HOME_HERO");
        if (banner.getStatus() == null) banner.setStatus("ACTIVE");
        if (banner.getStatus().equals("ACTIVE")) banner.setIsActive(true);
        banner.setCreatedBy(createdBy);
        banner.setUpdatedBy(createdBy);
        banner.setCreatedAt(LocalDateTime.now());
        banner.setUpdatedAt(LocalDateTime.now());
        return bannerRepository.save(banner);
    }

    @Transactional
    public Banner updateBanner(Long id, Banner updates, String updatedBy) {
        Banner existing = bannerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Banner không tồn tại"));
        if (updates.getTitle() != null) existing.setTitle(updates.getTitle());
        if (updates.getSubtitle() != null) existing.setSubtitle(updates.getSubtitle());
        if (updates.getImageUrl() != null) existing.setImageUrl(updates.getImageUrl());
        if (updates.getLinkUrl() != null) existing.setLinkUrl(updates.getLinkUrl());
        if (updates.getPosition() != null) existing.setPosition(updates.getPosition());
        if (updates.getDisplayOrder() != null) existing.setDisplayOrder(updates.getDisplayOrder());
        if (updates.getPriority() != null) existing.setPriority(updates.getPriority());
        if (updates.getStatus() != null) {
            existing.setStatus(updates.getStatus());
            existing.setIsActive("ACTIVE".equals(updates.getStatus()));
        }
        if (updates.getIsActive() != null) existing.setIsActive(updates.getIsActive());
        if (updates.getStartDate() != null) existing.setStartDate(updates.getStartDate());
        if (updates.getEndDate() != null) existing.setEndDate(updates.getEndDate());
        existing.setUpdatedBy(updatedBy);
        existing.setUpdatedAt(LocalDateTime.now());
        return bannerRepository.save(existing);
    }

    @Transactional
    public Banner updateBannerStatus(Long id, String status, String updatedBy) {
        Banner existing = bannerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Banner không tồn tại"));
        existing.setStatus(status);
        existing.setIsActive("ACTIVE".equals(status));
        existing.setUpdatedBy(updatedBy);
        existing.setUpdatedAt(LocalDateTime.now());
        return bannerRepository.save(existing);
    }

    @Transactional
    public void deleteBanner(Long id) {
        bannerRepository.deleteById(id);
    }

    // ═════════════════════════════════════════════════════════════════════
    // VOUCHERS
    // ═════════════════════════════════════════════════════════════════════

    public List<Voucher> getActiveVouchers() {
        return voucherRepository.findAllActive(LocalDateTime.now());
    }

    public List<Voucher> getAllVouchers() {
        return voucherRepository.findAll();
    }

    @Transactional
    public Voucher createVoucher(Voucher voucher, String createdBy) {
        if (voucher.getCode() == null || voucher.getCode().trim().isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã voucher không được trống");
        if (voucherRepository.existsByCode(voucher.getCode().trim().toUpperCase()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã voucher đã tồn tại");
        if (voucher.getName() == null || voucher.getName().trim().isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên voucher không được trống");
        if (voucher.getDiscountValue() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giá trị giảm giá không được trống");

        voucher.setCode(voucher.getCode().trim().toUpperCase());
        voucher.setUsedCount(0);
        if (voucher.getStatus() == null) voucher.setStatus("ACTIVE");
        voucher.setIsActive("ACTIVE".equals(voucher.getStatus()));
        voucher.setCreatedBy(createdBy);
        voucher.setUpdatedBy(createdBy);
        voucher.setCreatedAt(LocalDateTime.now());
        voucher.setUpdatedAt(LocalDateTime.now());
        return voucherRepository.save(voucher);
    }

    @Transactional
    public Voucher updateVoucher(Long id, Voucher updates, String updatedBy) {
        Voucher existing = voucherRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Voucher không tồn tại"));
        if (updates.getCode() != null) existing.setCode(updates.getCode().trim().toUpperCase());
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getDescription() != null) existing.setDescription(updates.getDescription());
        if (updates.getType() != null) existing.setType(updates.getType());
        if (updates.getDiscountValue() != null) existing.setDiscountValue(updates.getDiscountValue());
        if (updates.getMinOrderAmount() != null) existing.setMinOrderAmount(updates.getMinOrderAmount());
        if (updates.getMaxDiscountAmount() != null) existing.setMaxDiscountAmount(updates.getMaxDiscountAmount());
        if (updates.getMaxUses() != null) existing.setMaxUses(updates.getMaxUses());
        // Don't allow direct edit of usedCount - it's incremented on order
        if (updates.getPerUserLimit() != null) existing.setPerUserLimit(updates.getPerUserLimit());
        if (updates.getIsActive() != null) existing.setIsActive(updates.getIsActive());
        if (updates.getStatus() != null) {
            existing.setStatus(updates.getStatus());
            existing.setIsActive("ACTIVE".equals(updates.getStatus()));
        }
        if (updates.getTargetGroup() != null) existing.setTargetGroup(updates.getTargetGroup());
        if (updates.getFreeShipping() != null) existing.setFreeShipping(updates.getFreeShipping());
        if (updates.getStartDate() != null) existing.setStartDate(updates.getStartDate());
        if (updates.getEndDate() != null) existing.setEndDate(updates.getEndDate());
        existing.setUpdatedBy(updatedBy);
        existing.setUpdatedAt(LocalDateTime.now());
        return voucherRepository.save(existing);
    }

    @Transactional
    public Voucher updateVoucherStatus(Long id, String status, String updatedBy) {
        Voucher existing = voucherRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Voucher không tồn tại"));
        existing.setStatus(status);
        existing.setIsActive("ACTIVE".equals(status));
        existing.setUpdatedBy(updatedBy);
        existing.setUpdatedAt(LocalDateTime.now());
        return voucherRepository.save(existing);
    }

    @Transactional
    public void deleteVoucher(Long id) {
        voucherRepository.deleteById(id);
    }

    /** Validate a voucher for a given user/subtotal. Returns the voucher if OK. */
    public Voucher validateVoucher(String code, BigDecimal orderSubtotal, String userId, boolean isNewCustomer) {
        if (code == null || code.trim().isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập mã voucher");
        Voucher voucher = voucherRepository.findByCode(code.trim().toUpperCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mã voucher không tồn tại"));

        if (!"ACTIVE".equals(voucher.getStatus()) || Boolean.FALSE.equals(voucher.getIsActive()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã voucher đã bị vô hiệu hóa");
        if (voucher.getStartDate() != null && voucher.getStartDate().isAfter(LocalDateTime.now()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã voucher chưa có hiệu lực");
        if (voucher.getEndDate() != null && voucher.getEndDate().isBefore(LocalDateTime.now()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã voucher đã hết hạn");
        if (voucher.getMaxUses() != null && voucher.getUsedCount() != null && voucher.getUsedCount() >= voucher.getMaxUses())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã voucher đã hết lượt sử dụng");

        // targetGroup
        String target = voucher.getTargetGroup() == null ? "ALL" : voucher.getTargetGroup();
        if ("NEW_CUSTOMER".equals(target) && !isNewCustomer)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã này chỉ dành cho khách hàng mới");
        if ("RETURNING_CUSTOMER".equals(target) && isNewCustomer)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã này chỉ dành cho khách hàng cũ");

        // minOrder
        if (voucher.getMinOrderAmount() != null && orderSubtotal.compareTo(voucher.getMinOrderAmount()) < 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Đơn hàng tối thiểu " + voucher.getMinOrderAmount() + "đ để dùng mã này");

        // perUserLimit
        if (userId != null && voucher.getPerUserLimit() != null) {
            long userUses = redemptionRepository.countByVoucherIdAndUserId(voucher.getId(), userId);
            if (userUses >= voucher.getPerUserLimit())
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Bạn đã sử dụng hết lượt cho mã này");
        }
        return voucher;
    }

    /** Calculate discount for a voucher given subtotal. */
    public Map<String, Object> computeDiscount(Voucher voucher, BigDecimal subtotal) {
        Map<String, Object> res = new HashMap<>();
        BigDecimal discount = BigDecimal.ZERO;
        String type = voucher.getType() == null ? "PERCENT" : voucher.getType();

        if ("FREE_SHIPPING".equals(type)) {
            // Caller decides shipping fee; here just mark discount=0
            discount = BigDecimal.ZERO;
        } else if ("FIXED_AMOUNT".equals(type)) {
            discount = voucher.getDiscountValue();
            if (discount.compareTo(subtotal) > 0) discount = subtotal;
        } else { // PERCENT
            discount = subtotal.multiply(voucher.getDiscountValue())
                    .divide(new BigDecimal(100), 2, RoundingMode.HALF_UP);
            if (voucher.getMaxDiscountAmount() != null && discount.compareTo(voucher.getMaxDiscountAmount()) > 0)
                discount = voucher.getMaxDiscountAmount();
            if (discount.compareTo(subtotal) > 0) discount = subtotal;
        }
        res.put("discountAmount", discount);
        res.put("finalTotal", subtotal.subtract(discount).max(BigDecimal.ZERO));
        res.put("type", type);
        res.put("code", voucher.getCode());
        res.put("name", voucher.getName());
        res.put("freeShipping", Boolean.TRUE.equals(voucher.getFreeShipping()));
        return res;
    }

    @Transactional
    public void incrementVoucherUsage(Voucher voucher, String userId, String orderCode, BigDecimal orderTotal, BigDecimal discount) {
        voucher.setUsedCount(voucher.getUsedCount() == null ? 1 : voucher.getUsedCount() + 1);
        voucher.setUpdatedAt(LocalDateTime.now());
        voucherRepository.save(voucher);

        if (userId != null && !userId.trim().isEmpty()) {
            VoucherRedemption r = new VoucherRedemption();
            r.setVoucherId(voucher.getId());
            r.setUserId(userId);
            r.setOrderCode(orderCode);
            r.setOrderTotal(orderTotal);
            r.setDiscountAmount(discount);
            r.setCreatedAt(LocalDateTime.now());
            redemptionRepository.save(r);
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    // CAMPAIGNS
    // ═════════════════════════════════════════════════════════════════════

    public List<Campaign> getAllCampaigns() {
        return campaignRepository.findAll();
    }

    public Optional<Campaign> getCampaign(Long id) {
        return campaignRepository.findById(id);
    }

    @Transactional
    public Campaign createCampaign(Campaign campaign, String createdBy) {
        if (campaign.getName() == null || campaign.getName().trim().isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên campaign không được trống");
        if (campaign.getCode() != null) {
            String code = campaign.getCode().trim().toUpperCase();
            if (campaignRepository.findByCode(code).isPresent())
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã campaign đã tồn tại");
            campaign.setCode(code);
        }
        if (campaign.getStatus() == null) campaign.setStatus("DRAFT");
        if (campaign.getGoal() == null) campaign.setGoal("SALES");
        campaign.setCreatedBy(createdBy);
        campaign.setUpdatedBy(createdBy);
        campaign.setCreatedAt(LocalDateTime.now());
        campaign.setUpdatedAt(LocalDateTime.now());
        return campaignRepository.save(campaign);
    }

    @Transactional
    public Campaign updateCampaign(Long id, Campaign updates, String updatedBy) {
        Campaign existing = campaignRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign không tồn tại"));
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getCode() != null) {
            String code = updates.getCode().trim().toUpperCase();
            campaignRepository.findByCode(code).ifPresent(c -> {
                if (!c.getId().equals(existing.getId()))
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã campaign đã tồn tại");
            });
            existing.setCode(code);
        }
        if (updates.getDescription() != null) existing.setDescription(updates.getDescription());
        if (updates.getGoal() != null) existing.setGoal(updates.getGoal());
        if (updates.getBudget() != null) existing.setBudget(updates.getBudget());
        if (updates.getStatus() != null) existing.setStatus(updates.getStatus());
        if (updates.getIsActive() != null) existing.setIsActive(updates.getIsActive());
        if (updates.getStartDate() != null) existing.setStartDate(updates.getStartDate());
        if (updates.getEndDate() != null) existing.setEndDate(updates.getEndDate());
        existing.setUpdatedBy(updatedBy);
        existing.setUpdatedAt(LocalDateTime.now());
        return campaignRepository.save(existing);
    }

    @Transactional
    public Campaign updateCampaignStatus(Long id, String status, String updatedBy) {
        Campaign existing = campaignRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign không tồn tại"));
        existing.setStatus(status);
        existing.setIsActive("ACTIVE".equals(status));
        existing.setUpdatedBy(updatedBy);
        existing.setUpdatedAt(LocalDateTime.now());
        return campaignRepository.save(existing);
    }

    @Transactional
    public void deleteCampaign(Long id) {
        campaignRepository.deleteById(id);
    }

    // ═════════════════════════════════════════════════════════════════════
    // PRODUCT PLACEMENTS
    // ═════════════════════════════════════════════════════════════════════

    public List<ProductPlacement> getAllPlacements() {
        return placementRepository.findAll();
    }

    public List<ProductPlacement> getActivePlacementsByKey(String key) {
        return placementRepository.findActiveByKey(key, LocalDateTime.now());
    }

    @Transactional
    public ProductPlacement createPlacement(ProductPlacement p, String createdBy) {
        if (p.getPlacementKey() == null || p.getPlacementKey().trim().isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "placementKey không được trống");
        if (p.getProductId() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "productId không được trống");
        try {
            productRepository.findById(p.getProductId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sản phẩm không tồn tại"));
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sản phẩm không tồn tại: " + ex.getMessage());
        }
        if (p.getStatus() == null) p.setStatus("ACTIVE");
        p.setCreatedBy(createdBy);
        p.setUpdatedBy(createdBy);
        p.setCreatedAt(LocalDateTime.now());
        p.setUpdatedAt(LocalDateTime.now());
        return placementRepository.save(p);
    }

    @Transactional
    public ProductPlacement updatePlacement(Long id, ProductPlacement updates, String updatedBy) {
        ProductPlacement existing = placementRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Placement không tồn tại"));
        if (updates.getPlacementKey() != null) existing.setPlacementKey(updates.getPlacementKey());
        if (updates.getProductId() != null) existing.setProductId(updates.getProductId());
        if (updates.getPosition() != null) existing.setPosition(updates.getPosition());
        if (updates.getStatus() != null) existing.setStatus(updates.getStatus());
        if (updates.getStartDate() != null) existing.setStartDate(updates.getStartDate());
        if (updates.getEndDate() != null) existing.setEndDate(updates.getEndDate());
        existing.setUpdatedBy(updatedBy);
        existing.setUpdatedAt(LocalDateTime.now());
        return placementRepository.save(existing);
    }

    @Transactional
    public void deletePlacement(Long id) {
        placementRepository.deleteById(id);
    }

    // ═════════════════════════════════════════════════════════════════════
    // ANALYTICS / EVENTS
    // ═════════════════════════════════════════════════════════════════════

    @Transactional
    public void trackEvent(Long campaignId, String eventType, Long bannerId, Long voucherId,
                           String productId, String sessionId, String userId,
                           Long orderId, BigDecimal revenue) {
        if (eventType == null || eventType.trim().isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "eventType không được trống");
        CampaignAnalytics event = new CampaignAnalytics();
        event.setCampaignId(campaignId);
        event.setEventType(eventType.toUpperCase());
        event.setBannerId(bannerId);
        event.setVoucherId(voucherId);
        event.setProductId(productId);
        event.setSessionId(sessionId);
        event.setUserId(userId);
        event.setOrderId(orderId);
        event.setRevenue(revenue == null ? BigDecimal.ZERO : revenue);
        event.setCreatedAt(LocalDateTime.now());
        analyticsRepository.save(event);
    }

    public Map<String, Object> getAnalyticsOverview(LocalDateTime since) {
        Map<String, Object> result = new HashMap<>();
        // Use *Overview variant: campaignIdSentinel=-1 means all campaigns.
        // Split since=non-null vs null to avoid the "could not determine data type of parameter $2" error
        // (PostgreSQL cannot infer type when parameter is null inside "IS NULL OR ..." patterns).
        List<Object[]> rows = (since != null)
                ? analyticsRepository.countByEventTypeOverviewSince(-1L, since)
                : analyticsRepository.countByEventTypeOverview(-1L);
        long impressions = 0, clicks = 0, conversions = 0;
        for (Object[] row : rows) {
            String t = (String) row[0];
            long c = ((Number) row[1]).longValue();
            switch (t) {
                case "IMPRESSION": impressions = c; break;
                case "CLICK": clicks = c; break;
                case "CONVERSION": conversions = c; break;
            }
        }
        BigDecimal revenue = (since != null)
                ? analyticsRepository.sumRevenueSince(since)
                : analyticsRepository.sumRevenueAll();
        double ctr = impressions > 0 ? (double) clicks / impressions * 100 : 0;
        double cvr = clicks > 0 ? (double) conversions / clicks * 100 : 0;

        result.put("impressions", impressions);
        result.put("clicks", clicks);
        result.put("conversions", conversions);
        result.put("ctr", round2(ctr));
        result.put("conversionRate", round2(cvr));
        result.put("revenue", revenue);

        // Top banners
        List<Object[]> topBannersRows = (since != null)
                ? analyticsRepository.topBannersSince(since)
                : analyticsRepository.topBanners();
        List<Map<String, Object>> topBanners = new ArrayList<>();
        for (Object[] r : topBannersRows) {
            Long bid = (Long) r[0];
            long count = ((Number) r[1]).longValue();
            Banner banner = bannerRepository.findById(bid).orElse(null);
            Map<String, Object> b = new HashMap<>();
            b.put("bannerId", bid);
            b.put("count", count);
            b.put("title", banner != null ? banner.getTitle() : null);
            b.put("imageUrl", banner != null ? banner.getImageUrl() : null);
            topBanners.add(b);
        }
        result.put("topBanners", topBanners);

        // Top campaigns
        List<Object[]> topCampaignsRows = (since != null)
                ? analyticsRepository.topCampaignsSince(since)
                : analyticsRepository.topCampaigns();
        List<Map<String, Object>> topCampaigns = new ArrayList<>();
        for (Object[] r : topCampaignsRows) {
            Long cid = (Long) r[0];
            long count = ((Number) r[1]).longValue();
            campaignRepository.findById(cid).ifPresent(c -> {
                Map<String, Object> m = new HashMap<>();
                m.put("campaignId", cid);
                m.put("name", c.getName());
                m.put("count", count);
                topCampaigns.add(m);
            });
        }
        result.put("topCampaigns", topCampaigns);

        // Top vouchers (count by voucher_id where event=CONVERSION for revenue-style)
        Map<String, Object> voucherStats = computeTopVouchers(since);
        result.put("topVouchers", voucherStats.get("topVouchers"));

        return result;
    }

    public Map<String, Object> getCampaignAnalytics(Long campaignId, LocalDateTime since) {
        Map<String, Object> stats = new HashMap<>();
        long impressions = analyticsRepository.countByCampaignIdAndEventType(campaignId, "IMPRESSION");
        long clicks = analyticsRepository.countByCampaignIdAndEventType(campaignId, "CLICK");
        long conversions = analyticsRepository.countByCampaignIdAndEventType(campaignId, "CONVERSION");
        BigDecimal revenue = analyticsRepository.sumRevenueByCampaign(campaignId);
        stats.put("campaignId", campaignId);
        stats.put("impressions", impressions);
        stats.put("clicks", clicks);
        stats.put("conversions", conversions);
        stats.put("ctr", impressions > 0 ? round2((double) clicks / impressions * 100) : 0);
        stats.put("conversionRate", clicks > 0 ? round2((double) conversions / clicks * 100) : 0);
        stats.put("revenue", revenue);
        return stats;
    }

    public Map<String, Object> getBannerAnalytics(Long bannerId, LocalDateTime since) {
        long impressions = analyticsRepository.findAll().stream()
                .filter(a -> bannerId.equals(a.getBannerId()) && "IMPRESSION".equals(a.getEventType())).count();
        long clicks = analyticsRepository.findAll().stream()
                .filter(a -> bannerId.equals(a.getBannerId()) && "CLICK".equals(a.getEventType())).count();
        long conversions = analyticsRepository.findAll().stream()
                .filter(a -> bannerId.equals(a.getBannerId()) && "CONVERSION".equals(a.getEventType())).count();
        Map<String, Object> stats = new HashMap<>();
        stats.put("bannerId", bannerId);
        stats.put("impressions", impressions);
        stats.put("clicks", clicks);
        stats.put("conversions", conversions);
        stats.put("ctr", impressions > 0 ? round2((double) clicks / impressions * 100) : 0);
        return stats;
    }

    public Map<String, Object> getVoucherAnalytics(Long voucherId, LocalDateTime since) {
        long redemptions = analyticsRepository.findAll().stream()
                .filter(a -> voucherId.equals(a.getVoucherId()) && "CONVERSION".equals(a.getEventType())).count();
        Voucher voucher = voucherRepository.findById(voucherId).orElse(null);
        Map<String, Object> stats = new HashMap<>();
        stats.put("voucherId", voucherId);
        stats.put("redemptions", redemptions);
        stats.put("usedCount", voucher != null ? voucher.getUsedCount() : 0);
        stats.put("maxUses", voucher != null ? voucher.getMaxUses() : null);
        return stats;
    }

    private Map<String, Object> computeTopVouchers(LocalDateTime since) {
        Map<String, Object> result = new HashMap<>();
        List<Object[]> rows = analyticsRepository.findAll().stream()
                .filter(a -> "CONVERSION".equals(a.getEventType()) && a.getVoucherId() != null)
                .filter(a -> since == null || !a.getCreatedAt().isBefore(since))
                .collect(Collectors.groupingBy(CampaignAnalytics::getVoucherId))
                .entrySet().stream()
                .map(e -> new Object[]{e.getKey(), e.getValue().size()})
                .sorted((a, b) -> Long.compare(((Number) b[1]).longValue(), ((Number) a[1]).longValue()))
                .limit(10)
                .collect(Collectors.toList());

        List<Map<String, Object>> top = new ArrayList<>();
        for (Object[] r : rows) {
            Long vid = (Long) r[0];
            long count = ((Number) r[1]).longValue();
            Voucher v = voucherRepository.findById(vid).orElse(null);
            Map<String, Object> m = new HashMap<>();
            m.put("voucherId", vid);
            m.put("code", v != null ? v.getCode() : null);
            m.put("name", v != null ? v.getName() : null);
            m.put("count", count);
            top.add(m);
        }
        result.put("topVouchers", top);
        return result;
    }

    private static double round2(double v) { return Math.round(v * 100.0) / 100.0; }
}
