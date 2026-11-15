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

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private MailService mailService;

    @org.springframework.beans.factory.annotation.Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl = "http://localhost:3000";

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

    /**
     * Consent from someone whose ownership of the address is not proven (home page form, sign-up
     * before the e-mail is verified). Anyone could put any address on the marketing list. The
     * address is held as PENDING and receives nothing until the link in the confirmation e-mail
     * is opened (sendConfirmation) or, for a sign-up, the account's e-mail is verified (confirmOwner).
     *
     * @return false when the address is already subscribed (nothing to confirm)
     */
    @Transactional
    public boolean requestSubscription(String email, String userId, String source, boolean sendConfirmation) {
        String e = normalize(email);
        if (e == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email không hợp lệ");
        Optional<MarketingSubscription> existing = repository.findByEmailIgnoreCase(e);
        if (existing.isPresent() && existing.get().isSubscribed()) return false;
        LocalDateTime now = LocalDateTime.now();
        MarketingSubscription s = existing.orElseGet(() -> {
            MarketingSubscription created = new MarketingSubscription();
            created.setEmail(e);
            created.setUnsubscribeToken(newToken());
            return created;
        });
        // A repeated request within a minute does not mail the address again.
        boolean justSent = MarketingSubscription.PENDING.equals(s.getStatus())
                && s.getUpdatedAt() != null && s.getUpdatedAt().isAfter(now.minusSeconds(60));
        s.setStatus(MarketingSubscription.PENDING);
        s.setSource(source);
        if (userId != null) s.setUserId(userId);
        if (!justSent) s.setUpdatedAt(now);
        MarketingSubscription saved = repository.save(s);
        if (sendConfirmation && !justSent && mailService != null) {
            String link = frontendUrl.replaceAll("/+$", "") + "/newsletter/confirm?token=" + saved.getUnsubscribeToken();
            mailService.sendHtml(saved.getEmail(), "Xác nhận đăng ký nhận tin ET.TEE",
                    "<p>Chào bạn,</p><p>Có người (có thể là bạn) vừa đăng ký nhận email khuyến mãi của ET.TEE bằng địa chỉ này.</p>"
                            + "<p><a href=\"" + link + "\" style=\"background:#0f172a;color:#fff;padding:10px 18px;"
                            + "border-radius:999px;text-decoration:none\">Xác nhận đăng ký</a></p>"
                            + "<p style=\"font-size:12px;color:#64748b\">Nếu không phải bạn, hãy bỏ qua email này: "
                            + "bạn sẽ không nhận thêm email nào.</p>");
        }
        return true;
    }

    /** Link in the confirmation e-mail. False for an unknown token or an address that unsubscribed since. */
    @Transactional
    public boolean confirm(String token) {
        if (token == null || !token.matches("[a-f0-9]{32,64}")) return false;
        return repository.findByUnsubscribeToken(token).map(s -> {
            if (s.isSubscribed()) return true;
            if (!MarketingSubscription.PENDING.equals(s.getStatus())) return false;
            activate(s);
            return true;
        }).orElse(false);
    }

    /** The account holder proved the address (e-mail verification): a consent given at sign-up takes effect. */
    @Transactional
    public void confirmOwner(String email) {
        String e = normalize(email);
        if (e == null) return;
        repository.findByEmailIgnoreCase(e)
                .filter(s -> MarketingSubscription.PENDING.equals(s.getStatus()))
                .ifPresent(this::activate);
    }

    private void activate(MarketingSubscription s) {
        LocalDateTime now = LocalDateTime.now();
        s.setStatus(MarketingSubscription.SUBSCRIBED);
        s.setConsentedAt(now);
        s.setUnsubscribedAt(null);
        s.setUpdatedAt(now);
        repository.save(s);
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
        // A pending request can be withdrawn too.
        if (MarketingSubscription.UNSUBSCRIBED.equals(s.getStatus())) return;
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
