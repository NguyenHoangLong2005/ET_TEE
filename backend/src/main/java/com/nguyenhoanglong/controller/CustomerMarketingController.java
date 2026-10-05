package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.ApiResponse;
import com.nguyenhoanglong.entity.MarketingSubscription;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.UserRepository;
import com.nguyenhoanglong.service.CustomerVoucherService;
import com.nguyenhoanglong.service.MarketingSubscriptionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Shopper side of marketing: consent (sign up / unsubscribe / account switch) and "which vouchers can
 * I use". The /api/public/** routes work for guests too.
 */
@RestController
public class CustomerMarketingController {

    private final MarketingSubscriptionService subscriptions;
    private final CustomerVoucherService customerVouchers;
    private final UserRepository userRepository;

    public CustomerMarketingController(MarketingSubscriptionService subscriptions, CustomerVoucherService customerVouchers,
                                       UserRepository userRepository) {
        this.subscriptions = subscriptions;
        this.customerVouchers = customerVouchers;
        this.userRepository = userRepository;
    }

    /** Home page newsletter form. */
    @PostMapping("/api/public/newsletter")
    public ResponseEntity<ApiResponse<Void>> newsletter(@RequestBody Map<String, String> body) {
        User user = currentUser();
        subscriptions.subscribe(body.get("email"), user == null ? null : user.getId(),
                MarketingSubscriptionService.SOURCE_NEWSLETTER);
        return ResponseEntity.ok(ApiResponse.success("Đã đăng ký nhận tin khuyến mãi", null));
    }

    /** One-click unsubscribe from the link in every marketing email. */
    @PostMapping("/api/public/unsubscribe")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> unsubscribe(@RequestBody Map<String, String> body) {
        boolean ok = subscriptions.unsubscribe(body.get("token"));
        return ResponseEntity.ok(ApiResponse.success(Map.of("unsubscribed", ok)));
    }

    /** Vouchers usable for this subtotal, best first: public ones + the shopper's personal ones. */
    @GetMapping("/api/public/vouchers/for-me")
    public ResponseEntity<ApiResponse<List<CustomerVoucherService.VoucherOption>>> vouchersForMe(
            @RequestParam(required = false) BigDecimal subtotal) {
        User user = currentUser();
        return ResponseEntity.ok(ApiResponse.success(customerVouchers.optionsFor(user == null ? null : user.getId(), subtotal)));
    }

    @GetMapping("/api/account/marketing-consent")
    public ResponseEntity<ApiResponse<Map<String, Object>>> consent() {
        User user = requireUser();
        var sub = subscriptions.find(user.getEmail());
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "subscribed", sub.map(MarketingSubscription::isSubscribed).orElse(false),
                "since", sub.filter(MarketingSubscription::isSubscribed).map(s -> String.valueOf(s.getConsentedAt())).orElse(""))));
    }

    @PutMapping("/api/account/marketing-consent")
    public ResponseEntity<ApiResponse<Map<String, Object>>> setConsent(@RequestBody Map<String, Boolean> body) {
        User user = requireUser();
        if (Boolean.TRUE.equals(body.get("subscribed"))) {
            subscriptions.subscribe(user.getEmail(), user.getId(), MarketingSubscriptionService.SOURCE_ACCOUNT);
        } else {
            subscriptions.unsubscribeEmail(user.getEmail());
        }
        return consent();
    }

    private User currentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            return userRepository.findByEmail(auth.getName()).orElse(null);
        }
        return null;
    }

    private User requireUser() {
        User u = currentUser();
        if (u == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return u;
    }
}
