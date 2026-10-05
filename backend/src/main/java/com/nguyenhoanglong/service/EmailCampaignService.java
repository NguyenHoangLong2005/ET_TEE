package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.EmailCampaign;
import com.nguyenhoanglong.entity.MarketingMessage.Kind;
import com.nguyenhoanglong.entity.Voucher;
import com.nguyenhoanglong.repository.EmailCampaignRepository;
import com.nguyenhoanglong.repository.MarketingMessageRepository;
import com.nguyenhoanglong.repository.VoucherRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.task.TaskExecutor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Marketing email campaigns. Who receives one is decided by consent + an audience segment, never by
 * shop: customers belong to the brand. The optional voucher must be a public, brand-wide one.
 */
@Service
public class EmailCampaignService {

    public enum Segment {
        ALL_SUBSCRIBERS("Tất cả người đã đồng ý nhận email"),
        NEW_CUSTOMERS("Có tài khoản, chưa mua đơn nào"),
        RETURNING_CUSTOMERS("Đã mua ít nhất 1 đơn"),
        INTEREST_MEN("Hay xem đồ nam (90 ngày qua)"),
        INTEREST_WOMEN("Hay xem đồ nữ (90 ngày qua)"),
        INTEREST_KIDS("Hay xem đồ trẻ em (90 ngày qua)");

        public final String label;

        Segment(String label) {
            this.label = label;
        }
    }

    public record Recipient(String email, String userId) {}

    public record Stats(long sent, long failed, long opened, long redeemedOrders, BigDecimal redeemedRevenue) {}

    public record CampaignView(EmailCampaign campaign, String segmentLabel, String voucherCode, Stats stats) {}

    private static final Logger log = LoggerFactory.getLogger(EmailCampaignService.class);
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Set<String> CLOSED = Set.of("CANCELLED", "REFUNDED", "RETURNED");

    private final EmailCampaignRepository campaigns;
    private final MarketingMessageRepository messages;
    private final VoucherRepository vouchers;
    private final MarketingMailer mailer;
    private final JdbcTemplate jdbc;
    private final TaskExecutor executor;
    private final String frontendUrl;

    public EmailCampaignService(EmailCampaignRepository campaigns, MarketingMessageRepository messages,
                                VoucherRepository vouchers, MarketingMailer mailer, JdbcTemplate jdbc,
                                @Qualifier("taskExecutor") TaskExecutor executor,
                                @Value("${app.frontend-url:http://localhost:3000}") String frontendUrl) {
        this.campaigns = campaigns;
        this.messages = messages;
        this.vouchers = vouchers;
        this.mailer = mailer;
        this.jdbc = jdbc;
        this.executor = executor;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    // ── audience ─────────────────────────────────────────────────────────────

    public List<Recipient> audience(Segment segment) {
        String subscribed = """
                SELECT s.email, COALESCE(s.user_id, u.id) AS user_id
                FROM marketing_subscriptions s LEFT JOIN users u ON LOWER(u.email) = LOWER(s.email)
                WHERE s.status = 'SUBSCRIBED'
                """;
        String hasOrder = "EXISTS (SELECT 1 FROM orders o WHERE o.user_id = a.user_id AND o.status NOT IN ('CANCELLED', 'REFUNDED', 'RETURNED'))";
        List<Map<String, Object>> rows = switch (segment) {
            case ALL_SUBSCRIBERS -> jdbc.queryForList(subscribed);
            case NEW_CUSTOMERS -> jdbc.queryForList("SELECT * FROM (" + subscribed + ") a WHERE a.user_id IS NOT NULL AND NOT " + hasOrder);
            case RETURNING_CUSTOMERS -> jdbc.queryForList("SELECT * FROM (" + subscribed + ") a WHERE a.user_id IS NOT NULL AND " + hasOrder);
            case INTEREST_MEN, INTEREST_WOMEN, INTEREST_KIDS -> jdbc.queryForList("""
                    WITH a AS (%s),
                    v AS (SELECT e.user_id, LOWER(p.target_group) AS tg, COUNT(*) AS c
                          FROM user_behavior_events e JOIN products p ON p.id = e.product_id
                          WHERE e.event_type = 'VIEW' AND e.created_at >= ?
                          GROUP BY e.user_id, LOWER(p.target_group)),
                    top AS (SELECT user_id, tg, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY c DESC, tg) AS rn,
                                   SUM(c) OVER (PARTITION BY user_id) AS total
                            FROM v)
                    SELECT a.email, a.user_id FROM a JOIN top t ON t.user_id = a.user_id
                    WHERE t.rn = 1 AND t.total >= 3 AND t.tg = ?
                    """.formatted(subscribed), Timestamp.valueOf(LocalDateTime.now().minusDays(90)),
                    segment.name().substring("INTEREST_".length()).toLowerCase());
        };
        Map<String, Recipient> unique = new LinkedHashMap<>();
        for (Map<String, Object> r : rows) {
            String email = String.valueOf(r.get("email")).toLowerCase();
            unique.putIfAbsent(email, new Recipient(email, (String) r.get("user_id")));
        }
        return new ArrayList<>(unique.values());
    }

    // ── create / send ────────────────────────────────────────────────────────

    public EmailCampaign create(String name, String subject, String intro, Long voucherId, String segment, String createdBy) {
        if (name == null || name.isBlank()) throw bad("Tên chiến dịch không được trống");
        if (subject == null || subject.isBlank()) throw bad("Tiêu đề email không được trống");
        Segment seg = parseSegment(segment);
        if (voucherId != null) checkVoucher(voucherId);
        EmailCampaign c = new EmailCampaign();
        c.setName(name.trim());
        c.setSubject(subject.trim());
        c.setIntro(intro == null ? null : intro.trim());
        c.setVoucherId(voucherId);
        c.setSegment(seg.name());
        c.setCreatedBy(createdBy);
        c.setCreatedAt(LocalDateTime.now());
        return campaigns.save(c);
    }

    /** Starts sending in the background; only a DRAFT can be sent, exactly once. */
    public synchronized EmailCampaign send(Long id) {
        EmailCampaign c = campaigns.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!"DRAFT".equals(c.getStatus())) throw bad("Chiến dịch đã được gửi");
        Voucher voucher = c.getVoucherId() == null ? null : checkVoucher(c.getVoucherId());
        c.setStatus("SENDING");
        campaigns.save(c);
        executor.execute(() -> deliver(c, voucher));
        return c;
    }

    void deliver(EmailCampaign c, Voucher voucher) {
        List<Recipient> recipients = audience(Segment.valueOf(c.getSegment()));
        String body = body(c, voucher);
        int sent = 0;
        for (Recipient r : recipients) {
            try {
                if (mailer.send(Kind.CAMPAIGN, r.email(), r.userId(), c.getSubject(), body, c.getId(),
                        voucher == null ? null : voucher.getId()).sent()) sent++;
            } catch (RuntimeException e) {
                log.warn("Campaign {} to {} failed", c.getId(), r.email(), e);
            }
        }
        c.setRecipients(sent);
        c.setStatus("SENT");
        c.setSentAt(LocalDateTime.now());
        campaigns.save(c);
        log.info("Campaign {} sent to {}/{} recipients", c.getId(), sent, recipients.size());
    }

    // ── read ─────────────────────────────────────────────────────────────────

    public List<CampaignView> list() {
        return campaigns.findAllByOrderByCreatedAtDesc().stream().map(this::view).toList();
    }

    public CampaignView view(EmailCampaign c) {
        String code = c.getVoucherId() == null ? null : vouchers.findById(c.getVoucherId()).map(Voucher::getCode).orElse(null);
        return new CampaignView(c, Segment.valueOf(c.getSegment()).label, code, stats(c));
    }

    /**
     * Opens come from the tracking pixel (an estimate: some mail apps pre-load or block images).
     * "Redeemed" counts recipients who used the campaign's voucher AFTER the email went out: it shows
     * association, not proof the email caused the order.
     */
    Stats stats(EmailCampaign c) {
        long sent = messages.countByCampaignAndStatus(c.getId(), "SENT");
        long failed = messages.countByCampaignAndStatus(c.getId(), "FAILED");
        Long opened = jdbc.queryForObject("""
                SELECT COUNT(*) FROM marketing_messages m JOIN email_logs l ON l.tracking_token = m.email_tracking_token
                WHERE m.campaign_id = ? AND l.opened_at IS NOT NULL
                """, Long.class, c.getId());
        long redeemed = 0;
        BigDecimal revenue = BigDecimal.ZERO;
        if (c.getVoucherId() != null && c.getSentAt() != null) {
            List<Map<String, Object>> rows = jdbc.queryForList("""
                    SELECT o.status, o.total_amount FROM orders o
                    WHERE o.voucher_id = ? AND o.created_at >= ?
                      AND (o.user_id IN (SELECT m.user_id FROM marketing_messages m WHERE m.campaign_id = ? AND m.user_id IS NOT NULL)
                           OR LOWER(o.customer_email) IN (SELECT m.email FROM marketing_messages m WHERE m.campaign_id = ?))
                    """, c.getVoucherId(), Timestamp.valueOf(c.getSentAt().minusMinutes(5)), c.getId(), c.getId());
            for (Map<String, Object> r : rows) {
                if (CLOSED.contains(String.valueOf(r.get("status")))) continue;
                redeemed++;
                Object t = r.get("total_amount");
                if (t != null) revenue = revenue.add(new BigDecimal(String.valueOf(t)));
            }
        }
        return new Stats(sent, failed, opened == null ? 0 : opened, redeemed, revenue);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Voucher checkVoucher(Long id) {
        Voucher v = vouchers.findById(id).orElseThrow(() -> bad("Voucher không tồn tại"));
        if (!"ACTIVE".equalsIgnoreCase(v.getStatus()) || Boolean.FALSE.equals(v.getIsActive())) throw bad("Voucher chưa được kích hoạt");
        if (v.getEndDate() != null && v.getEndDate().isBefore(LocalDateTime.now())) throw bad("Voucher đã hết hạn");
        if (v.getGrantedToCustomerId() != null) throw bad("Không gửi voucher cá nhân của một khách cho cả nhóm");
        if (v.getShopId() != null) throw bad("Voucher gửi cho khách phải áp dụng toàn hệ thống (không gắn chi nhánh)");
        return v;
    }

    private String body(EmailCampaign c, Voucher v) {
        StringBuilder sb = new StringBuilder();
        if (c.getIntro() != null && !c.getIntro().isBlank()) {
            sb.append("<p>").append(HtmlUtils.htmlEscape(c.getIntro()).replace("\n", "<br/>")).append("</p>");
        }
        if (v != null) {
            NumberFormat vnd = NumberFormat.getInstance(Locale.forLanguageTag("vi-VN"));
            String what = "PERCENT".equalsIgnoreCase(v.getType())
                    ? "Giảm " + v.getDiscountValue().stripTrailingZeros().toPlainString() + "%"
                    : "Giảm " + vnd.format(v.getDiscountValue()) + "đ";
            if (v.getMinOrderAmount() != null && v.getMinOrderAmount().signum() > 0) {
                what += " cho đơn từ " + vnd.format(v.getMinOrderAmount()) + "đ";
            }
            sb.append("<div style=\"border:2px dashed #0f172a;border-radius:12px;padding:16px;text-align:center;margin:16px 0\">")
                    .append("<div style=\"font-size:13px;color:#475569\">").append(HtmlUtils.htmlEscape(what)).append("</div>")
                    .append("<div style=\"font-size:24px;font-weight:bold;letter-spacing:3px;margin:8px 0\">")
                    .append(HtmlUtils.htmlEscape(v.getCode())).append("</div>")
                    .append(v.getEndDate() != null ? "<div style=\"font-size:12px;color:#64748b\">Hạn dùng đến " + v.getEndDate().format(DATE) + "</div>" : "")
                    .append("</div>");
        }
        sb.append("<p><a href=\"").append(frontendUrl).append("\" style=\"background:#0f172a;color:#fff;padding:10px 18px;")
                .append("border-radius:999px;text-decoration:none\">Mua sắm ngay</a></p>");
        return sb.toString();
    }

    private static Segment parseSegment(String s) {
        try {
            return Segment.valueOf(s);
        } catch (RuntimeException e) {
            throw bad("Nhóm khách không hợp lệ");
        }
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}
