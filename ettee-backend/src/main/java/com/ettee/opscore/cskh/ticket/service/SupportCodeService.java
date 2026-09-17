package com.ettee.opscore.cskh.ticket.service;

import com.ettee.opscore.cskh.ticket.dto.IssueSupportCodeRequest;
import com.ettee.opscore.cskh.ticket.dto.SupportCodeDto;
import com.ettee.opscore.cskh.ticket.entity.StaffSupportLimit;
import com.ettee.opscore.cskh.ticket.entity.SupportCode;
import com.ettee.opscore.cskh.ticket.repository.StaffSupportLimitRepository;
import com.ettee.opscore.cskh.ticket.repository.SupportCodeRepository;
import com.ettee.opscore.common.exception.AppExceptions;
import com.ettee.opscore.storeowner.inventory.entity.ApprovalStatus;
import com.ettee.opscore.storeowner.promotion.entity.DiscountType;
import com.ettee.opscore.storeowner.promotion.entity.Promotion;
import com.ettee.opscore.storeowner.promotion.entity.PromotionStatus;
import com.ettee.opscore.storeowner.promotion.repository.PromotionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;

/**
 * "Gửi mã hỗ trợ theo hạn mức" — mỗi nhân viên CSKH có hạn mức riêng (staff_support_limits):
 * max_per_code (giá trị tối đa 1 mã) và max_per_day (tổng giá trị được phát trong 1 ngày).
 * Mỗi mã hỗ trợ gắn với 1 promotion (voucher) dùng riêng cho khách đó.
 */
@Service
@RequiredArgsConstructor
public class SupportCodeService {

    private final SupportCodeRepository supportCodeRepository;
    private final StaffSupportLimitRepository limitRepository;
    private final PromotionRepository promotionRepository;

    @Transactional
    public SupportCodeDto issue(IssueSupportCodeRequest request, UUID actorId) {        StaffSupportLimit limit = limitRepository.findById(actorId)
                .orElseThrow(() -> new AppExceptions.BusinessRuleViolationException(
                        "Bạn chưa được cấu hình hạn mức phát mã hỗ trợ — liên hệ Chủ cửa hàng/Admin"));

        if (request.value().compareTo(limit.getMaxPerCode()) > 0) {
            throw new AppExceptions.BusinessRuleViolationException(
                    "Giá trị mã (" + request.value() + ") vượt hạn mức tối đa mỗi mã (" + limit.getMaxPerCode() + ")");
        }

        Instant dayStart = LocalDate.now().atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant dayEnd = dayStart.plusSeconds(86400);
        BigDecimal issuedToday = supportCodeRepository.sumIssuedToday(actorId, dayStart, dayEnd);
        if (issuedToday.add(request.value()).compareTo(limit.getMaxPerDay()) > 0) {
            throw new AppExceptions.BusinessRuleViolationException(
                    "Vượt hạn mức phát mã trong ngày. Đã phát: " + issuedToday + " / hạn mức: " + limit.getMaxPerDay());
        }

        Promotion promo = new Promotion();
        promo.setCode("SUP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        promo.setName("Mã hỗ trợ CSKH cho khách hàng");
        promo.setDiscountType(DiscountType.fixed_amount);
        promo.setDiscountValue(request.value());
        promo.setMinOrderValue(BigDecimal.ZERO);
        promo.setUsageLimit(1);
        promo.setUsageLimitPerCustomer(1);
        promo.setCustomerScope("specific");
        promo.setStartAt(Instant.now());
        promo.setEndAt(request.expiresAt());
        promo.setStatus(PromotionStatus.active);
        promo.setCreatedBy(actorId);
        promo.setApprovedBy(actorId);
        promo.setApprovedAt(Instant.now());
        Promotion savedPromo = promotionRepository.save(promo);

        SupportCode code = new SupportCode();
        code.setTicketId(request.ticketId());
        code.setPromotionId(savedPromo.getId());
        code.setCustomerId(request.customerId());
        code.setValue(request.value());
        code.setIssuedBy(actorId);
        code.setApprovalStatus(ApprovalStatus.pending);
        code.setExpiresAt(request.expiresAt());
        SupportCode saved = supportCodeRepository.save(code);

        return toDto(saved, savedPromo.getCode());
    }

    @Transactional(readOnly = true)
    public com.ettee.opscore.common.dto.PageResponse<SupportCodeDto> list(Pageable pageable) {
        var page = supportCodeRepository.findAll(pageable);
        return com.ettee.opscore.common.dto.PageResponse.from(page.map(c -> {
            Promotion promo = promotionRepository.findById(c.getPromotionId()).orElse(null);
            return toDto(c, promo != null ? promo.getCode() : "—");
        }));
    }

    @Transactional
    public SupportCodeDto approve(UUID id, UUID approverId) {
        SupportCode code = supportCodeRepository.findById(id)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Mã hỗ trợ", id));
        if (code.getIssuedBy().equals(approverId)) {
            throw new AppExceptions.BusinessRuleViolationException("Không thể tự phê duyệt mã do chính mình phát hành");
        }
        code.setApprovalStatus(ApprovalStatus.approved);
        code.setApprovedBy(approverId);
        SupportCode saved = supportCodeRepository.save(code);
        Promotion promo = promotionRepository.findById(saved.getPromotionId()).orElseThrow();
        return toDto(saved, promo.getCode());
    }

    private SupportCodeDto toDto(SupportCode c, String promoCode) {
        return new SupportCodeDto(c.getId(), c.getTicketId(), c.getPromotionId(), promoCode, c.getCustomerId(),
                c.getValue(), c.getIssuedBy(), c.getApprovalStatus(), c.getApprovedBy(), c.getIssuedAt(), c.getExpiresAt());
    }
}
