package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.UserBehaviorEvent;
import com.nguyenhoanglong.repository.UserBehaviorEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Writes user_behavior_events: VIEW comes from the storefront (POST /api/events), ADD_TO_CART and
 * PURCHASE are recorded by the cart / checkout controllers after the action succeeded, so the
 * client cannot fake them.
 *
 * Tracking is best effort: every public method swallows its own failures, a lost event must never
 * fail an add-to-cart or a checkout.
 */
@Service
public class BehaviorEventService {

    public static final String VIEW = "VIEW";
    public static final String ADD_TO_CART = "ADD_TO_CART";
    public static final String PURCHASE = "PURCHASE";

    /** Same vocabulary as scripts/generate_synthetic_data.py so real and synthetic rows train together. */
    private static final Set<String> SOURCES = Set.of("browse", "search", "recommendation", "direct", "campaign");

    private static final Pattern SESSION_ID = Pattern.compile("[A-Za-z0-9-]{8,36}");

    private static final Logger log = LoggerFactory.getLogger(BehaviorEventService.class);

    private final UserBehaviorEventRepository repository;

    public BehaviorEventService(UserBehaviorEventRepository repository) {
        this.repository = repository;
    }

    /**
     * users.id for a signed-in shopper, otherwise a key derived from the guest cart token.
     * The token is normally a UUID already (web/src/lib/auth.ts); the non-UUID fallback token is
     * longer than the 36-char column, so it is hashed into a name-based UUID instead.
     * Null when neither is known (nothing is recorded then).
     */
    public static String resolveUserKey(String userId, String guestToken) {
        if (userId != null && !userId.isBlank()) return userId;
        if (guestToken == null || guestToken.isBlank()) return null;
        String token = guestToken.trim();
        if (token.length() == 36) {
            try {
                return UUID.fromString(token).toString();
            } catch (IllegalArgumentException ignored) {
                // not a UUID, hashed below
            }
        }
        return UUID.nameUUIDFromBytes(("guest:" + token).getBytes(StandardCharsets.UTF_8)).toString();
    }

    public static String deviceType(String userAgent) {
        if (userAgent == null) return null;
        String ua = userAgent.toLowerCase();
        if (ua.contains("ipad") || ua.contains("tablet")) return "tablet";
        if (ua.contains("mobi") || ua.contains("android") || ua.contains("iphone")) return "mobile";
        return "desktop";
    }

    /** @return false when the product does not exist / is not ACTIVE (nothing recorded). */
    public boolean recordView(String userKey, Long productId, String sessionId, String source, String userAgent) {
        if (userKey == null || productId == null) return false;
        try {
            List<BigDecimal> price = repository.findActiveProductPrice(productId);
            if (price.isEmpty()) return false;
            save(userKey, productId, VIEW, 1, price.get(0), sessionId, source, userAgent);
            return true;
        } catch (RuntimeException e) {
            log.warn("Could not record VIEW of product {}", productId, e);
            return false;
        }
    }

    public void recordAddToCart(String userKey, Long variantId, Integer quantity, String sessionId, String userAgent) {
        if (userKey == null || variantId == null) return;
        try {
            List<Object[]> rows = repository.findVariantProductAndPrice(variantId);
            if (rows.isEmpty()) return;
            Object[] row = rows.get(0);
            save(userKey, (Long) row[0], ADD_TO_CART, quantity, (BigDecimal) row[1], sessionId, null, userAgent);
        } catch (RuntimeException e) {
            log.warn("Could not record ADD_TO_CART of variant {}", variantId, e);
        }
    }

    public void recordPurchase(String userKey, String orderCode, String sessionId, String userAgent) {
        if (userKey == null || orderCode == null) return;
        try {
            for (Object[] line : repository.findOrderLines(orderCode)) {
                Double unitPrice = (Double) line[1];
                save(userKey, (Long) line[0], PURCHASE, (Integer) line[2],
                        unitPrice != null ? BigDecimal.valueOf(unitPrice) : null, sessionId, null, userAgent);
            }
        } catch (RuntimeException e) {
            log.warn("Could not record PURCHASE of order {}", orderCode, e);
        }
    }

    /** Called after sign-in: the guest's events now belong to the account. */
    public void mergeGuestIntoUser(String guestToken, String userId) {
        if (userId == null || guestToken == null || guestToken.isBlank()) return;
        try {
            repository.reassignUser(resolveUserKey(null, guestToken), userId);
        } catch (RuntimeException e) {
            log.warn("Could not move guest behavior events to user {}", userId, e);
        }
    }

    private void save(String userKey, Long productId, String type, Integer quantity, BigDecimal price,
                      String sessionId, String source, String userAgent) {
        UserBehaviorEvent event = new UserBehaviorEvent();
        event.setUserId(userKey);
        event.setProductId(productId);
        event.setEventType(type);
        event.setQuantity(quantity != null && quantity > 0 ? quantity : 1);
        event.setPriceAtEvent(price);
        event.setSessionId(sessionId != null && SESSION_ID.matcher(sessionId).matches() ? sessionId : null);
        event.setSource(source != null && SOURCES.contains(source) ? source : null);
        event.setDeviceType(deviceType(userAgent));
        event.setCreatedAt(LocalDateTime.now());
        repository.save(event);
    }
}
