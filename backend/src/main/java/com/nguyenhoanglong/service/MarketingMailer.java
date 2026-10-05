package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.EmailLog;
import com.nguyenhoanglong.entity.MarketingMessage;
import com.nguyenhoanglong.entity.MarketingSubscription;
import com.nguyenhoanglong.repository.MarketingMessageRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.util.Map;
import java.util.Optional;

/**
 * The only way marketing email leaves the system. It re-checks consent at send time (someone may
 * have unsubscribed after a campaign was queued), adds the "why you get this" footer with a
 * one-click unsubscribe link and the List-Unsubscribe header, and records the message.
 */
@Service
public class MarketingMailer {

    private final MailService mailService;
    private final MarketingSubscriptionService subscriptions;
    private final MarketingMessageRepository messages;
    private final String frontendUrl;
    private final boolean enabled;

    public MarketingMailer(MailService mailService, MarketingSubscriptionService subscriptions,
                           MarketingMessageRepository messages,
                           @Value("${app.frontend-url:http://localhost:3000}") String frontendUrl,
                           @Value("${app.marketing.email.enabled:true}") boolean enabled) {
        this.mailService = mailService;
        this.subscriptions = subscriptions;
        this.messages = messages;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
        this.enabled = enabled;
    }

    public record Outcome(boolean sent, String reason) {}

    public Outcome send(MarketingMessage.Kind kind, String email, String userId, String subject, String bodyHtml,
                        Long campaignId, Long voucherId) {
        Optional<MarketingSubscription> sub = subscriptions.find(email).filter(MarketingSubscription::isSubscribed);
        if (sub.isEmpty()) return new Outcome(false, "NOT_SUBSCRIBED");
        if (!enabled) return new Outcome(false, "EMAIL_DISABLED");

        String unsubscribeUrl = frontendUrl + "/unsubscribe?token=" + sub.get().getUnsubscribeToken();
        EmailLog log = mailService.sendHtml(sub.get().getEmail(), subject, layout(bodyHtml, unsubscribeUrl),
                Map.of("List-Unsubscribe", "<" + unsubscribeUrl + ">"));

        MarketingMessage m = new MarketingMessage();
        m.setKind(kind);
        m.setChannel(MarketingMessage.Channel.EMAIL);
        m.setStatus("SENT".equals(log.getStatus()) ? "SENT" : "FAILED");
        m.setEmail(sub.get().getEmail());
        m.setUserId(userId);
        m.setCampaignId(campaignId);
        m.setVoucherId(voucherId);
        m.setEmailTrackingToken(log.getTrackingToken());
        messages.save(m);
        return new Outcome("SENT".equals(m.getStatus()), m.getStatus());
    }

    /** Voucher put in the customer's wallet without an email (no consent, or as a record next to it). */
    public void recordWallet(MarketingMessage.Kind kind, String userId, Long voucherId, Long campaignId) {
        MarketingMessage m = new MarketingMessage();
        m.setKind(kind);
        m.setChannel(MarketingMessage.Channel.WALLET);
        m.setStatus("SENT");
        m.setUserId(userId);
        m.setVoucherId(voucherId);
        m.setCampaignId(campaignId);
        messages.save(m);
    }

    String layout(String bodyHtml, String unsubscribeUrl) {
        return "<div style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#0f172a\">"
                + "<h2 style=\"letter-spacing:2px\">ET.TEE</h2>" + bodyHtml
                + "<hr style=\"border:none;border-top:1px solid #e2e8f0;margin:24px 0\"/>"
                + "<p style=\"font-size:12px;color:#64748b\">Bạn nhận email này vì đã đồng ý nhận tin khuyến mãi từ ET.TEE. "
                + "<a href=\"" + HtmlUtils.htmlEscape(unsubscribeUrl) + "\">Hủy đăng ký</a> bất cứ lúc nào, chỉ một lần bấm.</p>"
                + "</div>";
    }
}
