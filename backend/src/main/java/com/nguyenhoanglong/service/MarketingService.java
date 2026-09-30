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

@Service
public class MarketingService {

    @Autowired private BannerRepository bannerRepository;
    @Autowired private VoucherRepository voucherRepository;
    @Autowired private CampaignRepository campaignRepository;
    @Autowired private CampaignAnalyticsRepository analyticsRepository;
    @Autowired private ProductPlacementRepository placementRepository;
    @Autowired private VoucherRedemptionRepository redemptionRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private MarketingPostRepository marketingPostRepository;

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
        // @RequestBody binds the JPA entity directly. IDENTITY-generated ids are
        // normally left null on a new instance, but a client-supplied "id" field
        // in the JSON body deserializes straight onto it; Spring Data's save()
        // then treats a non-null id as "not new" and issues a merge/UPDATE instead
        // of an insert, silently overwriting an unrelated existing row by id.
        banner.setId(null);
        if (banner.getTitle() == null || banner.getTitle().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tiêu đề banner không được trống");
        }
        if (banner.getImageUrl() == null || banner.getImageUrl().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL ảnh không được trống");
        }
        if (banner.getPosition() == null || banner.getPosition().trim().isEmpty()) {
            banner.setPosition("HOME_HERO");
        }
        if (banner.getStatus() == null) banner.setStatus("ACTIVE");
        banner.setIsActive("ACTIVE".equalsIgnoreCase(banner.getStatus()));
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
        if (updates.getImageUrl() != null) existing.setImageUrl(updates.getImageUrl());
        if (updates.getLinkUrl() != null) existing.setLinkUrl(updates.getLinkUrl());
        if (updates.getPosition() != null) existing.setPosition(updates.getPosition());
        if (updates.getDisplayOrder() != null) existing.setDisplayOrder(updates.getDisplayOrder());
        if (updates.getStatus() != null) {
            existing.setStatus(updates.getStatus());
            existing.setIsActive("ACTIVE".equalsIgnoreCase(updates.getStatus()));
        }
        if (updates.getIsActive() != null) {
            existing.setIsActive(updates.getIsActive());
            existing.setStatus(updates.getIsActive() ? "ACTIVE" : "INACTIVE");
        }
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
        existing.setIsActive("ACTIVE".equalsIgnoreCase(status));
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

    public List<Voucher> getVouchersByShop(Long shopId) {
        return (shopId == null) ? voucherRepository.findAll() : voucherRepository.findByShopId(shopId);
    }

    @Transactional
    public Voucher createVoucher(Voucher voucher, String createdBy) {
        // See createBanner() above for why this must be cleared before save().
        voucher.setId(null);
        if (voucher.getCode() == null || voucher.getCode().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã voucher không được trống");
        }
        String cleanCode = voucher.getCode().trim().toUpperCase();
        if (voucherRepository.existsByCode(cleanCode)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã voucher đã tồn tại");
        }
        if (voucher.getName() == null || voucher.getName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên voucher không được trống");
        }
        if (voucher.getDiscountValue() == null || voucher.getDiscountValue().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giá trị giảm giá phải lớn hơn 0");
        }

        String type = voucher.getType() != null ? voucher.getType().toUpperCase() : "PERCENT";
        if ("PERCENT".equals(type) || "PERCENTAGE".equals(type)) {
            type = "PERCENT";
            if (voucher.getDiscountValue().compareTo(new BigDecimal(100)) > 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phần trăm giảm giá không được vượt quá 100%");
            }
        }
        voucher.setType(type);

        if (voucher.getMinOrderAmount() != null && voucher.getMinOrderAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn hàng tối thiểu không được âm");
        }
        if (voucher.getMaxDiscountAmount() != null && voucher.getMaxDiscountAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giảm tối đa không được âm");
        }
        if (voucher.getMaxUses() != null && voucher.getMaxUses() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số lượt dùng tối đa phải lớn hơn 0");
        }
        if (voucher.getPerUserLimit() != null && voucher.getPerUserLimit() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giới hạn mỗi khách hàng phải lớn hơn 0");
        }
        if (voucher.getStartDate() != null && voucher.getEndDate() != null && voucher.getStartDate().isAfter(voucher.getEndDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày bắt đầu phải trước ngày kết thúc");
        }

        // Security: Prevent minting CSKH compensation vouchers via marketing API
        voucher.setGrantedToCustomerId(null);

        voucher.setCode(cleanCode);
        voucher.setUsedCount(0);

        if (voucher.getShopId() != null && !"APPROVED".equalsIgnoreCase(voucher.getStatus())) {
            // If created for a specific shop, route through store owner approval queue
            voucher.setStatus("PENDING_APPROVAL");
            voucher.setIsActive(false);
        } else if (voucher.getStatus() == null) {
            voucher.setStatus("ACTIVE");
            voucher.setIsActive(true);
        } else {
            voucher.setIsActive("ACTIVE".equalsIgnoreCase(voucher.getStatus()));
        }

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

        if (updates.getCode() != null) {
            String newCode = updates.getCode().trim().toUpperCase();
            if (!newCode.equals(existing.getCode()) && voucherRepository.existsByCode(newCode)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã voucher đã tồn tại");
            }
            existing.setCode(newCode);
        }
        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getDescription() != null) existing.setDescription(updates.getDescription());
        if (updates.getType() != null) {
            String type = updates.getType().toUpperCase();
            if ("PERCENTAGE".equals(type)) type = "PERCENT";
            existing.setType(type);
        }
        if (updates.getDiscountValue() != null) {
            if (updates.getDiscountValue().compareTo(BigDecimal.ZERO) <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giá trị giảm giá phải lớn hơn 0");
            }
            if ("PERCENT".equals(existing.getType()) && updates.getDiscountValue().compareTo(new BigDecimal(100)) > 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phần trăm giảm giá không được vượt quá 100%");
            }
            existing.setDiscountValue(updates.getDiscountValue());
        }
        if (updates.getMinOrderAmount() != null) existing.setMinOrderAmount(updates.getMinOrderAmount());
        if (updates.getMaxDiscountAmount() != null) existing.setMaxDiscountAmount(updates.getMaxDiscountAmount());
        if (updates.getMaxUses() != null) existing.setMaxUses(updates.getMaxUses());
        if (updates.getPerUserLimit() != null) existing.setPerUserLimit(updates.getPerUserLimit());
        if (updates.getIsActive() != null) existing.setIsActive(updates.getIsActive());
        if (updates.getStatus() != null) {
            existing.setStatus(updates.getStatus());
            existing.setIsActive("ACTIVE".equalsIgnoreCase(updates.getStatus()));
        }
        if (updates.getTargetGroup() != null) existing.setTargetGroup(updates.getTargetGroup());
        if (updates.getFreeShipping() != null) existing.setFreeShipping(updates.getFreeShipping());
        if (updates.getStartDate() != null) existing.setStartDate(updates.getStartDate());
        if (updates.getEndDate() != null) existing.setEndDate(updates.getEndDate());
        if (existing.getStartDate() != null && existing.getEndDate() != null && existing.getStartDate().isAfter(existing.getEndDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày bắt đầu phải trước ngày kết thúc");
        }

        existing.setUpdatedBy(updatedBy);
        existing.setUpdatedAt(LocalDateTime.now());
        return voucherRepository.save(existing);
    }

    @Transactional
    public Voucher updateVoucherStatus(Long id, String status, String updatedBy) {
        if (status == null || status.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái không được để trống");
        }
        String newStatus = status.trim().toUpperCase();
        Voucher existing = voucherRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Voucher không tồn tại"));

        // Campaigns already had validateCampaignTransition; this endpoint accepted
        // any string, so PENDING_APPROVAL -> ACTIVE (bypassing shop-owner approval)
        // or REJECTED -> ACTIVE (undoing a rejection) were both silently accepted.
        validateVoucherTransition(existing.getStatus(), newStatus);

        existing.setStatus(newStatus);
        existing.setIsActive("ACTIVE".equals(newStatus));
        existing.setUpdatedBy(updatedBy);
        existing.setUpdatedAt(LocalDateTime.now());
        return voucherRepository.save(existing);
    }

    /**
     * Marketing staff toggle ACTIVE/PAUSED and can cancel outright. Vouchers
     * awaiting or refused shop-owner approval are not reachable from here — that
     * decision belongs to StoreOwnerService#processVoucherApproval. CANCELLED and
     * EXPIRED are terminal for the same reason campaigns are: reviving an expired
     * or cancelled promotion should be a new voucher with a new code and audit
     * trail, not a silent resurrection of the old one.
     */
    private void validateVoucherTransition(String from, String to) {
        String normalizedFrom = from == null ? "ACTIVE" : from.toUpperCase();
        if (normalizedFrom.equals(to)) return;

        Set<String> allowedTargets = switch (normalizedFrom) {
            case "ACTIVE" -> Set.of("PAUSED", "CANCELLED", "EXPIRED");
            case "PAUSED" -> Set.of("ACTIVE", "CANCELLED", "EXPIRED");
            case "PENDING_APPROVAL", "REJECTED", "CANCELLED", "EXPIRED" -> Set.of();
            default -> Set.of("ACTIVE", "PAUSED", "CANCELLED");
        };

        if (!allowedTargets.contains(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    String.format("Không thể chuyển trạng thái voucher từ %s sang %s", normalizedFrom, to));
        }
    }

    @Transactional
    public void deleteVoucher(Long id) {
        Voucher existing = voucherRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Voucher không tồn tại"));
        // Safe delete: If voucher has redemption history, soft-cancel to preserve financial records
        if (redemptionRepository.existsByVoucherId(id) || (existing.getUsedCount() != null && existing.getUsedCount() > 0)) {
            existing.setStatus("CANCELLED");
            existing.setIsActive(false);
            existing.setUpdatedAt(LocalDateTime.now());
            voucherRepository.save(existing);
        } else {
            voucherRepository.deleteById(id);
        }
    }

    /** Validate a voucher for a given user/subtotal. Returns the voucher if OK. */
    public Voucher validateVoucher(String code, BigDecimal orderSubtotal, String userId, boolean isNewCustomer) {
        if (code == null || code.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập mã voucher");
        }
        Voucher voucher = voucherRepository.findByCode(code.trim().toUpperCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mã voucher không tồn tại"));

        if (!"ACTIVE".equalsIgnoreCase(voucher.getStatus()) || Boolean.FALSE.equals(voucher.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã voucher đã bị vô hiệu hóa");
        }
        if (voucher.getStartDate() != null && voucher.getStartDate().isAfter(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã voucher chưa có hiệu lực");
        }
        if (voucher.getEndDate() != null && voucher.getEndDate().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã voucher đã hết hạn");
        }
        if (voucher.getMaxUses() != null && voucher.getUsedCount() != null && voucher.getUsedCount() >= voucher.getMaxUses()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã voucher đã hết lượt sử dụng");
        }

        // targetGroup
        String target = voucher.getTargetGroup() == null ? "ALL" : voucher.getTargetGroup();
        if ("NEW_CUSTOMER".equals(target) && !isNewCustomer) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã này chỉ dành cho khách hàng mới");
        }
        if ("RETURNING_CUSTOMER".equals(target) && isNewCustomer) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã này chỉ dành cho khách hàng cũ");
        }

        // minOrder
        if (voucher.getMinOrderAmount() != null && orderSubtotal.compareTo(voucher.getMinOrderAmount()) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Đơn hàng tối thiểu " + voucher.getMinOrderAmount() + "đ để dùng mã này");
        }

        // perUserLimit
        if (userId != null && voucher.getPerUserLimit() != null) {
            long userUses = redemptionRepository.countByVoucherIdAndUserId(voucher.getId(), userId);
            if (userUses >= voucher.getPerUserLimit()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bạn đã sử dụng hết lượt cho mã này");
            }
        }

        // Customer Binding check for CSKH Compensation Vouchers
        if (voucher.getGrantedToCustomerId() != null && !voucher.getGrantedToCustomerId().trim().isEmpty()) {
            if (userId == null || !userId.equals(voucher.getGrantedToCustomerId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã voucher tri ân này không thuộc về tài khoản của bạn");
            }
        }

        return voucher;
    }

    /** Calculate discount for a voucher given subtotal. */
    public Map<String, Object> computeDiscount(Voucher voucher, BigDecimal subtotal) {
        Map<String, Object> res = new HashMap<>();
        BigDecimal discount = BigDecimal.ZERO;
        String type = voucher.getType() == null ? "PERCENT" : voucher.getType();

        if ("FREE_SHIPPING".equalsIgnoreCase(type) || "FREE_SHIP".equalsIgnoreCase(type)) {
            discount = BigDecimal.ZERO;
        } else if ("FIXED_AMOUNT".equalsIgnoreCase(type)) {
            discount = voucher.getDiscountValue();
            if (discount.compareTo(subtotal) > 0) discount = subtotal;
        } else { // PERCENT
            discount = subtotal.multiply(voucher.getDiscountValue())
                    .divide(new BigDecimal(100), 2, RoundingMode.HALF_UP);
            if (voucher.getMaxDiscountAmount() != null && discount.compareTo(voucher.getMaxDiscountAmount()) > 0) {
                discount = voucher.getMaxDiscountAmount();
            }
            if (discount.compareTo(subtotal) > 0) discount = subtotal;
        }
        res.put("discountAmount", discount);
        res.put("finalTotal", subtotal.subtract(discount).max(BigDecimal.ZERO));
        res.put("type", type);
        res.put("code", voucher.getCode());
        res.put("name", voucher.getName());
        res.put("freeShipping", Boolean.TRUE.equals(voucher.getFreeShipping()) || "FREE_SHIPPING".equalsIgnoreCase(type));
        return res;
    }

    /**
     * Atomically increments voucher usage and writes redemption record.
     * Prevents race condition and ensures DB-level usage cap enforcement.
     */
    @Transactional
    public void incrementVoucherUsage(Voucher voucher, String userId, String orderCode, BigDecimal orderTotal, BigDecimal discount) {
        int updated = voucherRepository.incrementUsedCountAtomic(voucher.getId(), LocalDateTime.now());
        if (updated == 0 && voucher.getMaxUses() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Mã voucher đã hết lượt sử dụng");
        }

        // Always write a redemption record so vouchers.used_count and COUNT(voucher_redemptions) stay in sync
        VoucherRedemption r = new VoucherRedemption();
        r.setVoucherId(voucher.getId());
        r.setUserId((userId != null && !userId.trim().isEmpty()) ? userId : "GUEST-" + orderCode);
        r.setOrderCode(orderCode);
        r.setOrderTotal(orderTotal != null ? orderTotal : BigDecimal.ZERO);
        r.setDiscountAmount(discount != null ? discount : BigDecimal.ZERO);
        r.setCreatedAt(LocalDateTime.now());
        redemptionRepository.save(r);
    }

    // ═════════════════════════════════════════════════════════════════════
    // CAMPAIGNS & LIFECYCLE
    // ═════════════════════════════════════════════════════════════════════

    public List<Campaign> getAllCampaigns() {
        return campaignRepository.findAll();
    }

    public Optional<Campaign> getCampaign(Long id) {
        return campaignRepository.findById(id);
    }

    @Transactional
    public Campaign createCampaign(Campaign campaign, String createdBy) {
        // See createBanner() above for why this must be cleared before save().
        campaign.setId(null);
        if (campaign.getName() == null || campaign.getName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên campaign không được trống");
        }
        if (campaign.getCode() != null && !campaign.getCode().trim().isEmpty()) {
            String code = campaign.getCode().trim().toUpperCase();
            if (campaignRepository.findByCode(code).isPresent()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã campaign đã tồn tại");
            }
            campaign.setCode(code);
        } else {
            campaign.setCode("CAMP-" + System.currentTimeMillis());
        }

        if (campaign.getBudget() != null && campaign.getBudget().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngân sách không được âm");
        }
        if (campaign.getStartDate() != null && campaign.getEndDate() != null && campaign.getStartDate().isAfter(campaign.getEndDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày bắt đầu phải trước ngày kết thúc");
        }

        if (campaign.getStatus() == null || campaign.getStatus().trim().isEmpty()) {
            campaign.setStatus("DRAFT");
        } else {
            campaign.setStatus(campaign.getStatus().trim().toUpperCase());
        }
        campaign.setIsActive("ACTIVE".equals(campaign.getStatus()));

        if (campaign.getGoal() == null) campaign.setGoal("SALES");
        if (campaign.getType() == null) campaign.setType("SEASONAL");
        if (campaign.getTargetAudience() == null) campaign.setTargetAudience("ALL");

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

        if (updates.getName() != null) existing.setName(updates.getName().trim());
        if (updates.getCode() != null && !updates.getCode().trim().isEmpty()) {
            String code = updates.getCode().trim().toUpperCase();
            campaignRepository.findByCode(code).ifPresent(c -> {
                if (!c.getId().equals(existing.getId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã campaign đã tồn tại");
                }
            });
            existing.setCode(code);
        }
        if (updates.getDescription() != null) existing.setDescription(updates.getDescription());
        if (updates.getGoal() != null) existing.setGoal(updates.getGoal());
        if (updates.getType() != null) existing.setType(updates.getType());
        if (updates.getTargetAudience() != null) existing.setTargetAudience(updates.getTargetAudience());
        if (updates.getBudget() != null) {
            if (updates.getBudget().compareTo(BigDecimal.ZERO) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngân sách không được âm");
            }
            existing.setBudget(updates.getBudget());
        }
        if (updates.getStatus() != null && !updates.getStatus().equalsIgnoreCase(existing.getStatus())) {
            validateCampaignTransition(existing.getStatus(), updates.getStatus().toUpperCase());
            existing.setStatus(updates.getStatus().toUpperCase());
            existing.setIsActive("ACTIVE".equals(existing.getStatus()));
        }
        if (updates.getStartDate() != null) existing.setStartDate(updates.getStartDate());
        if (updates.getEndDate() != null) existing.setEndDate(updates.getEndDate());
        if (existing.getStartDate() != null && existing.getEndDate() != null && existing.getStartDate().isAfter(existing.getEndDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày bắt đầu phải trước ngày kết thúc");
        }

        existing.setUpdatedBy(updatedBy);
        existing.setUpdatedAt(LocalDateTime.now());
        return campaignRepository.save(existing);
    }

    @Transactional
    public Campaign updateCampaignStatus(Long id, String newStatusStr, String updatedBy) {
        if (newStatusStr == null || newStatusStr.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái không được để trống");
        }
        String newStatus = newStatusStr.trim().toUpperCase();
        Campaign existing = campaignRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign không tồn tại"));

        validateCampaignTransition(existing.getStatus(), newStatus);
        existing.setStatus(newStatus);
        existing.setIsActive("ACTIVE".equals(newStatus));
        existing.setUpdatedBy(updatedBy);
        existing.setUpdatedAt(LocalDateTime.now());
        return campaignRepository.save(existing);
    }

    private void validateCampaignTransition(String from, String to) {
        if (from == null) from = "DRAFT";
        if (from.equals(to)) return;

        Set<String> allowedTargets = switch (from) {
            case "DRAFT" -> Set.of("SCHEDULED", "ACTIVE", "CANCELLED");
            case "SCHEDULED" -> Set.of("ACTIVE", "CANCELLED");
            case "ACTIVE" -> Set.of("PAUSED", "COMPLETED", "CANCELLED");
            case "PAUSED" -> Set.of("ACTIVE", "COMPLETED", "CANCELLED");
            case "COMPLETED" -> Set.of();
            case "CANCELLED" -> Set.of();
            default -> Set.of("ACTIVE", "CANCELLED");
        };

        if (!allowedTargets.contains(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    String.format("Không thể chuyển trạng thái chiến dịch từ %s sang %s", from, to));
        }
    }

    @Transactional
    public void deleteCampaign(Long id) {
        Campaign existing = campaignRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign không tồn tại"));
        existing.setStatus("CANCELLED");
        existing.setIsActive(false);
        existing.setUpdatedAt(LocalDateTime.now());
        campaignRepository.save(existing);
    }

    // ═════════════════════════════════════════════════════════════════════
    // PRODUCT PLACEMENTS
    // ═════════════════════════════════════════════════════════════════════

    public List<ProductPlacement> getAllPlacements() {
        return placementRepository.findAll();
    }

    public List<ProductPlacement> getPlacementsBySection(String section) {
        return placementRepository.findByPlacementKeyOrderByPositionAsc(section);
    }

    public List<ProductPlacement> getActivePlacementsByKey(String key) {
        return placementRepository.findActiveByKey(key, LocalDateTime.now());
    }

    @Transactional
    public ProductPlacement createPlacement(ProductPlacement p, String createdBy) {
        if (p.getPlacementKey() == null || p.getPlacementKey().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "placementKey không được trống");
        }
        if (p.getProductId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "productId không được trống");
        }
        productRepository.findById(p.getProductId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sản phẩm không tồn tại"));

        if (p.getStatus() == null) p.setStatus("ACTIVE");
        if (p.getPosition() == null || p.getPosition() == 0) {
            List<ProductPlacement> existing = placementRepository.findByPlacementKeyOrderByPositionAsc(p.getPlacementKey());
            p.setPosition(existing.size() + 1);
        }
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
    public void reorderPlacements(String section, List<Long> orderedIds) {
        if (orderedIds == null || orderedIds.isEmpty()) return;
        for (int i = 0; i < orderedIds.size(); i++) {
            Long id = orderedIds.get(i);
            Optional<ProductPlacement> opt = placementRepository.findById(id);
            if (opt.isPresent()) {
                ProductPlacement p = opt.get();
                p.setPosition(i + 1);
                p.setUpdatedAt(LocalDateTime.now());
                placementRepository.save(p);
            }
        }
    }

    @Transactional
    public void deletePlacement(Long id) {
        placementRepository.deleteById(id);
    }

    public Map<String, Object> mapPlacementWithProduct(ProductPlacement placement) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", placement.getId());
        map.put("productId", placement.getProductId());
        map.put("section", placement.getPlacementKey());
        map.put("placementKey", placement.getPlacementKey());
        map.put("displayOrder", placement.getPosition());
        map.put("position", placement.getPosition());
        map.put("status", placement.getStatus());
        map.put("startDate", placement.getStartDate());
        map.put("endDate", placement.getEndDate());

        try {
            productRepository.findById(placement.getProductId()).ifPresent(prod -> {
                Map<String, Object> pMap = new LinkedHashMap<>();
                pMap.put("id", prod.getId());
                pMap.put("name", prod.getName());
                pMap.put("sku", prod.getId() != null ? "SKU-" + prod.getId() : "");
                String img = (prod.getImages() != null && !prod.getImages().isEmpty())
                        ? prod.getImages().get(0).getImageUrl() : "";
                pMap.put("imageUrl", img);
                pMap.put("price", prod.getPrice());
                pMap.put("salePrice", prod.getSalePrice());
                map.put("product", pMap);
            });
        } catch (Exception ignore) {}

        return map;
    }

    // ═════════════════════════════════════════════════════════════════════
    // MARKETING POSTS
    // ═════════════════════════════════════════════════════════════════════

    public List<MarketingPost> getAllPosts(String status, String query) {
        String s = (status == null || "ALL".equalsIgnoreCase(status) || status.isBlank()) ? null : status.trim().toUpperCase();
        String q = (query == null || query.isBlank()) ? null : query.trim();
        return marketingPostRepository.searchPosts(s, q);
    }

    public Optional<MarketingPost> getPostById(Long id) {
        return marketingPostRepository.findById(id);
    }

    public Optional<MarketingPost> getPostBySlug(String slug) {
        return marketingPostRepository.findBySlug(slug);
    }

    @Transactional
    public MarketingPost createPost(MarketingPost post, String author) {
        if (post.getTitle() == null || post.getTitle().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tiêu đề bài viết không được để trống");
        }
        if (post.getSlug() == null || post.getSlug().trim().isEmpty()) {
            String slug = post.getTitle().toLowerCase().trim().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
            post.setSlug(slug.isEmpty() ? "post-" + System.currentTimeMillis() : slug);
        }
        if (marketingPostRepository.existsBySlug(post.getSlug())) {
            post.setSlug(post.getSlug() + "-" + System.currentTimeMillis());
        }
        post.setAuthor(author != null ? author : "Marketing Team");
        if (post.getStatus() == null) post.setStatus("DRAFT");
        if ("PUBLISHED".equalsIgnoreCase(post.getStatus()) && post.getPublishedAt() == null) {
            post.setPublishedAt(LocalDateTime.now());
        }
        post.setCreatedAt(LocalDateTime.now());
        post.setUpdatedAt(LocalDateTime.now());
        return marketingPostRepository.save(post);
    }

    @Transactional
    public MarketingPost updatePost(Long id, MarketingPost updates, String updater) {
        MarketingPost existing = marketingPostRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài viết"));
        if (updates.getTitle() != null) existing.setTitle(updates.getTitle().trim());
        if (updates.getSlug() != null && !updates.getSlug().trim().isEmpty()) {
            String newSlug = updates.getSlug().trim();
            marketingPostRepository.findBySlug(newSlug).ifPresent(other -> {
                if (!other.getId().equals(existing.getId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slug đã được sử dụng");
                }
            });
            existing.setSlug(newSlug);
        }
        if (updates.getExcerpt() != null) existing.setExcerpt(updates.getExcerpt());
        if (updates.getContent() != null) existing.setContent(updates.getContent());
        if (updates.getCoverImageUrl() != null) existing.setCoverImageUrl(updates.getCoverImageUrl());
        if (updates.getTags() != null) existing.setTags(updates.getTags());
        if (updates.getStatus() != null) {
            existing.setStatus(updates.getStatus().toUpperCase());
            if ("PUBLISHED".equalsIgnoreCase(updates.getStatus()) && existing.getPublishedAt() == null) {
                existing.setPublishedAt(LocalDateTime.now());
            }
        }
        existing.setUpdatedAt(LocalDateTime.now());
        return marketingPostRepository.save(existing);
    }

    @Transactional
    public void deletePost(Long id) {
        marketingPostRepository.deleteById(id);
    }

    // ═════════════════════════════════════════════════════════════════════
    // ANALYTICS / EVENTS (REAL AGGREGATIONS)
    // ═════════════════════════════════════════════════════════════════════

    @Transactional
    public void trackEvent(Long campaignId, String eventType, Long bannerId, Long voucherId,
                           String productId, String sessionId, String userId,
                           Long orderId, BigDecimal revenue) {
        if (eventType == null || eventType.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "eventType không được trống");
        }
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
        Map<String, Object> result = new LinkedHashMap<>();

        List<Object[]> rows = (since != null)
                ? analyticsRepository.countByEventTypeOverviewSince(-1L, since)
                : analyticsRepository.countByEventTypeOverview(-1L);

        long impressions = 0, clicks = 0, conversions = 0;
        for (Object[] row : rows) {
            String t = (String) row[0];
            long c = ((Number) row[1]).longValue();
            switch (t) {
                case "IMPRESSION" -> impressions = c;
                case "CLICK" -> clicks = c;
                case "CONVERSION" -> conversions = c;
            }
        }
        BigDecimal revenue = (since != null)
                ? analyticsRepository.sumRevenueSince(since)
                : analyticsRepository.sumRevenueAll();
        double ctr = impressions > 0 ? (double) clicks / impressions * 100 : 0;
        double cvr = clicks > 0 ? (double) conversions / clicks * 100 : 0;

        long vouchersUsed = (since != null)
                ? redemptionRepository.countByCreatedAtAfter(since)
                : redemptionRepository.count();

        result.put("impressions", impressions);
        result.put("clicks", clicks);
        result.put("conversions", conversions);
        result.put("ctr", round2(ctr));
        result.put("conversionRate", round2(cvr));
        result.put("revenue", revenue != null ? revenue : BigDecimal.ZERO);
        result.put("vouchersUsed", vouchersUsed);

        Map<String, Object> overview = new LinkedHashMap<>();
        overview.put("impressions", impressions);
        overview.put("clicks", clicks);
        overview.put("conversions", conversions);
        overview.put("ctr", round2(ctr));
        overview.put("conversionRate", round2(cvr));
        overview.put("revenue", revenue != null ? revenue : BigDecimal.ZERO);
        overview.put("vouchersUsed", vouchersUsed);
        overview.put("totalRedemptions", vouchersUsed);
        overview.put("activeCampaigns", campaignRepository.countByStatus("ACTIVE"));
        overview.put("activeVouchers", voucherRepository.countByStatus("ACTIVE"));
        result.put("overview", overview);

        // Top banners
        List<Object[]> topBannersRows = (since != null)
                ? analyticsRepository.topBannersSince(since)
                : analyticsRepository.topBanners();
        List<Map<String, Object>> topBanners = new ArrayList<>();
        for (Object[] r : topBannersRows) {
            Long bid = (Long) r[0];
            long count = ((Number) r[1]).longValue();
            Banner banner = bannerRepository.findById(bid).orElse(null);
            Map<String, Object> b = new LinkedHashMap<>();
            b.put("bannerId", bid);
            b.put("name", banner != null ? banner.getTitle() : "Banner #" + bid);
            b.put("position", banner != null ? banner.getPosition() : "HERO");
            b.put("impressions", count);
            long bClicks = (since != null)
                    ? analyticsRepository.countByBannerIdAndEventTypeSince(bid, "CLICK", since)
                    : analyticsRepository.countByBannerIdAndEventType(bid, "CLICK");
            b.put("clicks", bClicks);
            b.put("ctr", count > 0 ? round2((double) bClicks / count * 100) : 0);
            topBanners.add(b);
        }
        result.put("topBanners", topBanners);
        result.put("banners", topBanners);

        // Top campaigns
        List<Object[]> topCampaignsRows = (since != null)
                ? analyticsRepository.topCampaignsSince(since)
                : analyticsRepository.topCampaigns();
        List<Map<String, Object>> topCampaigns = new ArrayList<>();
        int rank = 1;
        for (Object[] r : topCampaignsRows) {
            Long cid = (Long) r[0];
            Campaign c = campaignRepository.findById(cid).orElse(null);
            if (c != null) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("rank", rank++);
                m.put("campaignId", cid);
                m.put("name", c.getName());
                long cImp = (since != null)
                        ? analyticsRepository.countByCampaignIdAndEventTypeSince(cid, "IMPRESSION", since)
                        : analyticsRepository.countByCampaignIdAndEventType(cid, "IMPRESSION");
                long cClicks = (since != null)
                        ? analyticsRepository.countByCampaignIdAndEventTypeSince(cid, "CLICK", since)
                        : analyticsRepository.countByCampaignIdAndEventType(cid, "CLICK");
                long cConv = (since != null)
                        ? analyticsRepository.countByCampaignIdAndEventTypeSince(cid, "CONVERSION", since)
                        : analyticsRepository.countByCampaignIdAndEventType(cid, "CONVERSION");
                BigDecimal cRev = (since != null)
                        ? analyticsRepository.sumRevenueByCampaignSince(cid, since)
                        : analyticsRepository.sumRevenueByCampaign(cid);
                m.put("impressions", cImp);
                m.put("clicks", cClicks);
                m.put("ctr", cImp > 0 ? round2((double) cClicks / cImp * 100) : 0);
                m.put("conversions", cConv);
                m.put("revenue", cRev);
                m.put("trend", "up");
                topCampaigns.add(m);
            }
        }
        result.put("topCampaigns", topCampaigns);
        result.put("campaigns", topCampaigns);
        result.put("campaignPerformances", topCampaigns);

        // Vouchers breakdown
        List<Object[]> voucherAggRows = (since != null)
                ? redemptionRepository.aggregateVoucherRedemptionsSince(since)
                : redemptionRepository.aggregateVoucherRedemptions();
        List<Map<String, Object>> vouchersList = new ArrayList<>();
        for (Object[] r : voucherAggRows) {
            Long vid = (Long) r[0];
            long used = ((Number) r[1]).longValue();
            BigDecimal totalDiscount = (BigDecimal) r[2];
            double avgOrder = ((Number) r[3]).doubleValue();
            Voucher v = voucherRepository.findById(vid).orElse(null);
            if (v != null) {
                Map<String, Object> vm = new LinkedHashMap<>();
                vm.put("code", v.getCode());
                vm.put("name", v.getName());
                vm.put("used", used);
                vm.put("totalDiscount", totalDiscount);
                vm.put("avgOrder", round2(avgOrder));
                vm.put("convRate", 100.0);
                vouchersList.add(vm);
            }
        }
        result.put("vouchers", vouchersList);
        result.put("topVouchers", vouchersList);

        return result;
    }

    public Map<String, Object> getCampaignAnalytics(Long campaignId, LocalDateTime since) {
        Map<String, Object> stats = new HashMap<>();
        long impressions = (since != null)
                ? analyticsRepository.countByCampaignIdAndEventTypeSince(campaignId, "IMPRESSION", since)
                : analyticsRepository.countByCampaignIdAndEventType(campaignId, "IMPRESSION");
        long clicks = (since != null)
                ? analyticsRepository.countByCampaignIdAndEventTypeSince(campaignId, "CLICK", since)
                : analyticsRepository.countByCampaignIdAndEventType(campaignId, "CLICK");
        long conversions = (since != null)
                ? analyticsRepository.countByCampaignIdAndEventTypeSince(campaignId, "CONVERSION", since)
                : analyticsRepository.countByCampaignIdAndEventType(campaignId, "CONVERSION");
        BigDecimal revenue = (since != null)
                ? analyticsRepository.sumRevenueByCampaignSince(campaignId, since)
                : analyticsRepository.sumRevenueByCampaign(campaignId);

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
        long impressions = (since != null)
                ? analyticsRepository.countByBannerIdAndEventTypeSince(bannerId, "IMPRESSION", since)
                : analyticsRepository.countByBannerIdAndEventType(bannerId, "IMPRESSION");
        long clicks = (since != null)
                ? analyticsRepository.countByBannerIdAndEventTypeSince(bannerId, "CLICK", since)
                : analyticsRepository.countByBannerIdAndEventType(bannerId, "CLICK");
        long conversions = (since != null)
                ? analyticsRepository.countByBannerIdAndEventTypeSince(bannerId, "CONVERSION", since)
                : analyticsRepository.countByBannerIdAndEventType(bannerId, "CONVERSION");

        Map<String, Object> stats = new HashMap<>();
        stats.put("bannerId", bannerId);
        stats.put("impressions", impressions);
        stats.put("clicks", clicks);
        stats.put("conversions", conversions);
        stats.put("ctr", impressions > 0 ? round2((double) clicks / impressions * 100) : 0);
        return stats;
    }

    public Map<String, Object> getVoucherAnalytics(Long voucherId, LocalDateTime since) {
        long redemptions = (since != null)
                ? analyticsRepository.countVoucherConversionsSince(voucherId, since)
                : analyticsRepository.countVoucherConversions(voucherId);
        Voucher voucher = voucherRepository.findById(voucherId).orElse(null);
        Map<String, Object> stats = new HashMap<>();
        stats.put("voucherId", voucherId);
        stats.put("redemptions", redemptions);
        stats.put("usedCount", voucher != null ? voucher.getUsedCount() : 0);
        stats.put("maxUses", voucher != null ? voucher.getMaxUses() : null);
        return stats;
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    // ═════════════════════════════════════════════════════════════════════
    // PUBLIC — Product fetch for frontend
    // ═════════════════════════════════════════════════════════════════════

    public Product getProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sản phẩm không tồn tại"));
    }
}
