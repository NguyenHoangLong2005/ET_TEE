package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.MarketingMessage.Kind;
import com.nguyenhoanglong.entity.Voucher;
import com.nguyenhoanglong.repository.MarketingMessageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Automatic messages tied to what one customer did (not to a shop - customers belong to the brand):
 *
 *   WELCOME         newly verified account -> personal first-order voucher in "Voucher của tôi";
 *                   emailed too when the customer opted in
 *   ABANDONED_CART  items left in the cart 24-72 h, no order since -> reminder email (opted-in only)
 *   WIN_BACK        last order 60-90 days ago -> personal comeback voucher + email (opted-in only)
 *
 * Each kind is recorded in marketing_messages so nobody gets the same automation twice (WELCOME
 * once ever, the others at most once per cool-down). Marketing email always goes through
 * MarketingMailer, which re-checks consent.
 */
@Service
public class LifecycleMarketingService {

    private static final Logger log = LoggerFactory.getLogger(LifecycleMarketingService.class);
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final int BATCH = 200;

    private final JdbcTemplate jdbc;
    private final MarketingMessageRepository messages;
    private final MarketingMailer mailer;
    private final CustomerVoucherService vouchers;
    private final String frontendUrl;
    private final boolean enabled;

    @Value("${app.lifecycle.welcome.percent:10}") BigDecimal welcomePercent;
    @Value("${app.lifecycle.welcome.max-discount:50000}") BigDecimal welcomeMax;
    @Value("${app.lifecycle.welcome.valid-days:30}") int welcomeDays;
    /** Only accounts verified recently get the welcome voucher: no back-fill of existing customers. */
    @Value("${app.lifecycle.welcome.window-days:3}") int welcomeWindowDays;
    @Value("${app.lifecycle.winback.percent:15}") BigDecimal winBackPercent;
    @Value("${app.lifecycle.winback.max-discount:70000}") BigDecimal winBackMax;
    @Value("${app.lifecycle.winback.valid-days:21}") int winBackDays;

    public LifecycleMarketingService(JdbcTemplate jdbc, MarketingMessageRepository messages, MarketingMailer mailer,
                                     CustomerVoucherService vouchers,
                                     @Value("${app.frontend-url:http://localhost:3000}") String frontendUrl,
                                     @Value("${app.lifecycle.enabled:true}") boolean enabled) {
        this.jdbc = jdbc;
        this.messages = messages;
        this.mailer = mailer;
        this.vouchers = vouchers;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
        this.enabled = enabled;
    }

    // ── WELCOME ──────────────────────────────────────────────────────────────

    @Scheduled(fixedDelayString = "${app.lifecycle.welcome.check-ms:600000}", initialDelay = 120000)
    public void welcomeJob() {
        if (enabled) runWelcome();
    }

    public int runWelcome() {
        List<Map<String, Object>> users = jdbc.queryForList("""
                SELECT u.id, u.email, u.full_name FROM users u
                WHERE u.role = 'USER' AND u.email_verified = TRUE AND u.status = 'ACTIVE' AND u.created_at >= ?
                  AND NOT EXISTS (SELECT 1 FROM marketing_messages m WHERE m.user_id = u.id AND m.kind = 'WELCOME')
                ORDER BY u.created_at LIMIT ?
                """, Timestamp.valueOf(LocalDateTime.now().minusDays(welcomeWindowDays)), BATCH);
        int n = 0;
        for (Map<String, Object> u : users) {
            String userId = (String) u.get("id");
            if (messages.existsByUserIdAndKind(userId, Kind.WELCOME)) continue;
            Voucher v = vouchers.issuePersonal(userId, "WELCOME", "Quà chào mừng thành viên mới",
                    "Giảm " + welcomePercent.stripTrailingZeros().toPlainString() + "% cho đơn hàng đầu tiên",
                    welcomePercent, welcomeMax, BigDecimal.ZERO, welcomeDays, "NEW_CUSTOMER", "SYSTEM:WELCOME");
            mailer.recordWallet(Kind.WELCOME, userId, v.getId(), null);
            mailer.send(Kind.WELCOME, (String) u.get("email"), userId, "Chào mừng bạn đến với ET.TEE - quà cho đơn đầu tiên",
                    "<p>Chào " + esc(u.get("full_name")) + ",</p><p>Cảm ơn bạn đã đăng ký tài khoản ET.TEE. "
                            + "Đây là mã giảm giá cho đơn hàng đầu tiên của bạn:</p>" + voucherBlock(v)
                            + "<p>Mã đã có sẵn trong <a href=\"" + frontendUrl + "/account/vouchers\">Voucher của tôi</a> "
                            + "và sẽ được gợi ý khi bạn thanh toán.</p>",
                    null, v.getId());
            n++;
        }
        if (n > 0) log.info("Welcome vouchers issued: {}", n);
        return n;
    }

    // ── ABANDONED CART ───────────────────────────────────────────────────────

    @Scheduled(cron = "${app.lifecycle.abandoned-cart.cron:0 15 * * * *}")
    public void abandonedCartJob() {
        if (enabled) runAbandonedCart();
    }

    public int runAbandonedCart() {
        LocalDateTime now = LocalDateTime.now();
        List<Map<String, Object>> carts = jdbc.queryForList("""
                SELECT c.id AS cart_id, u.id AS user_id, u.email, u.full_name,
                       MAX(COALESCE(ci.updated_at, ci.created_at)) AS last_change
                FROM carts c
                JOIN users u ON u.id = c.user_id
                JOIN cart_items ci ON ci.cart_id = c.id
                JOIN marketing_subscriptions s ON LOWER(s.email) = LOWER(u.email) AND s.status = 'SUBSCRIBED'
                GROUP BY c.id, u.id, u.email, u.full_name
                HAVING MAX(COALESCE(ci.updated_at, ci.created_at)) BETWEEN ? AND ?
                LIMIT ?
                """, Timestamp.valueOf(now.minusHours(72)), Timestamp.valueOf(now.minusHours(24)), BATCH);
        int n = 0;
        for (Map<String, Object> c : carts) {
            String userId = (String) c.get("user_id");
            Timestamp lastChange = (Timestamp) c.get("last_change");
            Integer ordered = jdbc.queryForObject("SELECT COUNT(*) FROM orders WHERE user_id = ? AND created_at >= ?",
                    Integer.class, userId, lastChange);
            if (ordered != null && ordered > 0) continue;
            if (messages.existsByUserIdAndKindAndCreatedAtAfter(userId, Kind.ABANDONED_CART, now.minusDays(7))) continue;
            List<Map<String, Object>> items = jdbc.queryForList("""
                    SELECT p.name, pv.size, pv.color, ci.quantity FROM cart_items ci
                    JOIN product_variants pv ON pv.id = ci.product_variant_id JOIN products p ON p.id = pv.product_id
                    WHERE ci.cart_id = ? ORDER BY ci.id LIMIT 5
                    """, c.get("cart_id"));
            if (items.isEmpty()) continue;
            StringBuilder list = new StringBuilder("<ul>");
            for (Map<String, Object> it : items) {
                list.append("<li>").append(esc(it.get("name")))
                        .append(it.get("size") != null ? " - size " + esc(it.get("size")) : "")
                        .append(it.get("color") != null ? ", " + esc(it.get("color")) : "")
                        .append(" × ").append(it.get("quantity")).append("</li>");
            }
            list.append("</ul>");
            mailer.send(Kind.ABANDONED_CART, (String) c.get("email"), userId, "Bạn còn sản phẩm trong giỏ hàng ET.TEE",
                    "<p>Chào " + esc(c.get("full_name")) + ",</p><p>Giỏ hàng của bạn vẫn đang chờ:</p>" + list
                            + "<p><a href=\"" + frontendUrl + "/cart\" style=\"background:#0f172a;color:#fff;padding:10px 18px;"
                            + "border-radius:999px;text-decoration:none\">Xem giỏ hàng</a></p>"
                            + "<p style=\"font-size:12px;color:#64748b\">Giá và tồn kho có thể đã thay đổi kể từ khi bạn thêm vào giỏ.</p>",
                    null, null);
            n++;
        }
        if (n > 0) log.info("Abandoned-cart reminders sent: {}", n);
        return n;
    }

    // ── WIN-BACK ─────────────────────────────────────────────────────────────

    @Scheduled(cron = "${app.lifecycle.winback.cron:0 0 10 * * *}")
    public void winBackJob() {
        if (enabled) runWinBack();
    }

    public int runWinBack() {
        LocalDateTime now = LocalDateTime.now();
        List<Map<String, Object>> users = jdbc.queryForList("""
                SELECT u.id, u.email, u.full_name, MAX(o.created_at) AS last_order
                FROM users u
                JOIN marketing_subscriptions s ON LOWER(s.email) = LOWER(u.email) AND s.status = 'SUBSCRIBED'
                JOIN orders o ON o.user_id = u.id AND o.status NOT IN ('CANCELLED', 'REFUNDED', 'RETURNED')
                WHERE u.status = 'ACTIVE'
                GROUP BY u.id, u.email, u.full_name
                HAVING MAX(o.created_at) BETWEEN ? AND ?
                LIMIT ?
                """, Timestamp.valueOf(now.minusDays(90)), Timestamp.valueOf(now.minusDays(60)), BATCH);
        int n = 0;
        for (Map<String, Object> u : users) {
            String userId = (String) u.get("id");
            if (messages.existsByUserIdAndKindAndCreatedAtAfter(userId, Kind.WIN_BACK, now.minusDays(90))) continue;
            Voucher v = vouchers.issuePersonal(userId, "COMEBACK", "Mời bạn quay lại ET.TEE",
                    "Giảm " + winBackPercent.stripTrailingZeros().toPlainString() + "% cho đơn tiếp theo",
                    winBackPercent, winBackMax, BigDecimal.ZERO, winBackDays, "ALL", "SYSTEM:WIN_BACK");
            mailer.recordWallet(Kind.WIN_BACK, userId, v.getId(), null);
            mailer.send(Kind.WIN_BACK, (String) u.get("email"), userId, "ET.TEE nhớ bạn - quà cho lần mua tiếp theo",
                    "<p>Chào " + esc(u.get("full_name")) + ",</p><p>Đã một thời gian bạn chưa ghé ET.TEE. "
                            + "Tặng bạn mã giảm giá cho lần mua tiếp theo:</p>" + voucherBlock(v),
                    null, v.getId());
            n++;
        }
        if (n > 0) log.info("Win-back vouchers issued: {}", n);
        return n;
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    String voucherBlock(Voucher v) {
        NumberFormat vnd = NumberFormat.getInstance(Locale.forLanguageTag("vi-VN"));
        String limit = v.getMaxDiscountAmount() != null ? " (tối đa " + vnd.format(v.getMaxDiscountAmount()) + "đ)" : "";
        return "<div style=\"border:2px dashed #0f172a;border-radius:12px;padding:16px;text-align:center;margin:16px 0\">"
                + "<div style=\"font-size:13px;color:#475569\">" + esc(v.getDescription()) + limit + "</div>"
                + "<div style=\"font-size:24px;font-weight:bold;letter-spacing:3px;margin:8px 0\">" + esc(v.getCode()) + "</div>"
                + "<div style=\"font-size:12px;color:#64748b\">Hạn dùng đến " + v.getEndDate().format(DATE)
                + " · chỉ dùng cho tài khoản của bạn</div></div>";
    }

    private static String esc(Object o) {
        return o == null ? "" : HtmlUtils.htmlEscape(String.valueOf(o));
    }
}
