package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.Voucher;
import com.nguyenhoanglong.repository.VoucherRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

/**
 * The customer's side of vouchers: personal vouchers issued by the system ("Voucher của tôi"), and
 * which code is worth most for the current cart. Every voucher here is brand-wide (shop_id NULL):
 * shoppers are customers of ET.TEE, not of one branch.
 */
@Service
public class CustomerVoucherService {

    /** One voucher as the shopper sees it for a given subtotal. */
    public record VoucherOption(String code, String name, String description, String type, BigDecimal discountValue,
                                BigDecimal minOrderAmount, BigDecimal maxDiscountAmount, boolean freeShipping,
                                LocalDateTime endDate, boolean personal, boolean usable, BigDecimal discountAmount,
                                String reason) {}

    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // no 0/O, 1/I
    private static final SecureRandom RANDOM = new SecureRandom();

    private final VoucherRepository voucherRepository;
    private final MarketingService marketingService;

    public CustomerVoucherService(VoucherRepository voucherRepository, MarketingService marketingService) {
        this.voucherRepository = voucherRepository;
        this.marketingService = marketingService;
    }

    /**
     * A single-use voucher only this customer can redeem (validateVoucher checks grantedToCustomerId).
     * {@code targetGroup} NEW_CUSTOMER makes it valid for the first order only.
     */
    @Transactional
    public Voucher issuePersonal(String userId, String codePrefix, String name, String description,
                                 BigDecimal percent, BigDecimal maxDiscount, BigDecimal minOrder,
                                 int validDays, String targetGroup, String issuedBy) {
        Voucher v = new Voucher();
        v.setCode(uniqueCode(codePrefix));
        v.setName(name);
        v.setDescription(description);
        v.setType("PERCENT");
        v.setDiscountValue(percent);
        v.setMaxDiscountAmount(maxDiscount);
        v.setMinOrderAmount(minOrder);
        v.setMaxUses(1);
        v.setUsedCount(0);
        v.setPerUserLimit(1);
        v.setTargetGroup(targetGroup);
        v.setGrantedToCustomerId(userId);
        v.setShopId(null);
        v.setStatus("ACTIVE");
        v.setIsActive(true);
        v.setStartDate(LocalDateTime.now());
        v.setEndDate(LocalDateTime.now().plusDays(validDays));
        v.setCreatedBy(issuedBy);
        v.setUpdatedBy(issuedBy);
        v.setCreatedAt(LocalDateTime.now());
        v.setUpdatedAt(LocalDateTime.now());
        return voucherRepository.save(v);
    }

    /**
     * Public vouchers plus this customer's personal ones, each checked with the same rules as checkout
     * (validateVoucher). Usable ones first, biggest discount first; the rest say why not.
     */
    @Transactional(readOnly = true)
    public List<VoucherOption> optionsFor(String userId, BigDecimal subtotal) {
        BigDecimal total = subtotal == null ? BigDecimal.ZERO : subtotal.max(BigDecimal.ZERO);
        LocalDateTime now = LocalDateTime.now();
        Map<String, Voucher> byCode = new LinkedHashMap<>();
        if (userId != null) voucherRepository.findPersonalActive(userId, now).forEach(v -> byCode.put(v.getCode(), v));
        voucherRepository.findAllActive(now).forEach(v -> byCode.putIfAbsent(v.getCode(), v));

        List<VoucherOption> out = new ArrayList<>();
        for (Voucher v : byCode.values()) {
            boolean usable = true;
            BigDecimal discount = BigDecimal.ZERO;
            String reason = null;
            try {
                marketingService.validateVoucher(v.getCode(), total, userId);
                Object d = marketingService.computeDiscount(v, total).get("discountAmount");
                discount = d instanceof BigDecimal b ? b : new BigDecimal(String.valueOf(d));
            } catch (ResponseStatusException e) {
                usable = false;
                reason = e.getReason();
            }
            out.add(new VoucherOption(v.getCode(), v.getName(), v.getDescription(), v.getType(), v.getDiscountValue(),
                    v.getMinOrderAmount(), v.getMaxDiscountAmount(), Boolean.TRUE.equals(v.getFreeShipping()),
                    v.getEndDate(), v.getGrantedToCustomerId() != null, usable, discount, reason));
        }
        out.sort(Comparator.comparing(VoucherOption::usable).reversed()
                .thenComparing(VoucherOption::discountAmount, Comparator.reverseOrder())
                .thenComparing(VoucherOption::personal, Comparator.reverseOrder()));
        return out;
    }

    private String uniqueCode(String prefix) {
        for (int attempt = 0; attempt < 20; attempt++) {
            StringBuilder sb = new StringBuilder(prefix).append('-');
            for (int i = 0; i < 6; i++) sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
            if (!voucherRepository.existsByCode(sb.toString())) return sb.toString();
        }
        throw new IllegalStateException("Could not generate a unique voucher code");
    }
}
