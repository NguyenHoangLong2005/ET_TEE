package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.MarketingSubscription;
import com.nguyenhoanglong.repository.MarketingSubscriptionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Who agreed to receive marketing email. Opt-in only: nobody is subscribed unless they ticked the
 * box at sign-up, switched it on in their account, or used the newsletter form. Every marketing
 * email carries a one-click unsubscribe link ({@link #unsubscribe}).
 */
@Service
public class MarketingSubscriptionService {

    public static final String SOURCE_REGISTER = "REGISTER";
    public static final String SOURCE_ACCOUNT = "ACCOUNT";
    public static final String SOURCE_NEWSLETTER = "NEWSLETTER";

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final MarketingSubscriptionRepository repository;

    public MarketingSubscriptionService(MarketingSubscriptionRepository repository) {
        this.repository = repository;
    }

    static String normalize(String email) {
        if (email == null) return null;
        String e = email.trim().toLowerCase();
        return EMAIL.matcher(e).matches() && e.length() <= 255 ? e : null;
    }

    @Transactional
    public MarketingSubscription subscribe(String email, String userId, String source) {
        String e = normalize(email);
        if (e == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email không hợp lệ");
        LocalDateTime now = LocalDateTime.now();
        MarketingSubscription s = repository.findByEmailIgnoreCase(e).orElseGet(() -> {
            MarketingSubscription created = new MarketingSubscription();
            created.setEmail(e);
            created.setUnsubscribeToken(newToken());
            return created;
        });
        if (!s.isSubscribed() || s.getConsentedAt() == null) {
            s.setConsentedAt(now);                    // a new consent, with its own time and source
            s.setSource(source);
        }
        s.setStatus(MarketingSubscription.SUBSCRIBED);
        s.setUnsubscribedAt(null);
        if (userId != null) s.setUserId(userId);
        s.setUpdatedAt(now);
        return repository.save(s);
    }

    /** One-click unsubscribe from an email link. False when the token is unknown. */
    @Transactional
    public boolean unsubscribe(String token) {
        if (token == null || !token.matches("[a-f0-9]{32,64}")) return false;
        return repository.findByUnsubscribeToken(token).map(s -> {
            markUnsubscribed(s);
            return true;
        }).orElse(false);
    }

    @Transactional
    public void unsubscribeEmail(String email) {
        String e = normalize(email);
        if (e != null) repository.findByEmailIgnoreCase(e).ifPresent(this::markUnsubscribed);
    }

    @Transactional(readOnly = true)
    public boolean isSubscribed(String email) {
        String e = normalize(email);
        return e != null && repository.findByEmailIgnoreCase(e).map(MarketingSubscription::isSubscribed).orElse(false);
    }

    @Transactional(readOnly = true)
    public Optional<MarketingSubscription> find(String email) {
        String e = normalize(email);
        return e == null ? Optional.empty() : repository.findByEmailIgnoreCase(e);
    }

    private void markUnsubscribed(MarketingSubscription s) {
        if (!s.isSubscribed()) return;
        s.setStatus(MarketingSubscription.UNSUBSCRIBED);
        s.setUnsubscribedAt(LocalDateTime.now());
        s.setUpdatedAt(LocalDateTime.now());
        repository.save(s);
    }

    private static String newToken() {
        byte[] b = new byte[24];
        RANDOM.nextBytes(b);
        return HexFormat.of().formatHex(b);
    }
}
