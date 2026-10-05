package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.EmailLog;
import com.nguyenhoanglong.entity.MarketingMessage;
import com.nguyenhoanglong.entity.MarketingSubscription;
import com.nguyenhoanglong.repository.MarketingMessageRepository;
import com.nguyenhoanglong.repository.MarketingSubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Consent rules and the marketing mailer: no consent, no marketing email. */
class MarketingConsentTest {

    private final MarketingSubscriptionRepository repo = mock(MarketingSubscriptionRepository.class);
    private final Map<String, MarketingSubscription> byEmail = new HashMap<>();
    private final MarketingSubscriptionService subscriptions = new MarketingSubscriptionService(repo);
    private final MailService mailService = mock(MailService.class);
    private final MarketingMessageRepository messages = mock(MarketingMessageRepository.class);

    @BeforeEach
    void inMemoryRepo() {
        when(repo.save(any())).thenAnswer(i -> {
            MarketingSubscription s = i.getArgument(0);
            byEmail.put(s.getEmail(), s);
            return s;
        });
        when(repo.findByEmailIgnoreCase(anyString())).thenAnswer(i -> Optional.ofNullable(byEmail.get(((String) i.getArgument(0)).toLowerCase())));
        when(repo.findByUnsubscribeToken(anyString())).thenAnswer(i -> byEmail.values().stream()
                .filter(s -> s.getUnsubscribeToken().equals(i.getArgument(0))).findFirst());
    }

    private MarketingMailer mailer(boolean enabled) {
        return new MarketingMailer(mailService, subscriptions, messages, "https://shop.test/", enabled);
    }

    @Test
    void subscribeNormalisesEmailAndRecordsSource() {
        MarketingSubscription s = subscriptions.subscribe("  An.Nguyen@Example.com ", "u1", "REGISTER");
        assertEquals("an.nguyen@example.com", s.getEmail());
        assertEquals("REGISTER", s.getSource());
        assertTrue(s.getUnsubscribeToken().matches("[a-f0-9]{48}"));
        assertTrue(subscriptions.isSubscribed("AN.NGUYEN@example.com"));
    }

    @Test
    void invalidEmailIsRejected() {
        assertThrows(ResponseStatusException.class, () -> subscriptions.subscribe("not-an-email", null, "NEWSLETTER"));
    }

    @Test
    void unsubscribeByTokenThenResubscribeGetsANewConsentTime() throws Exception {
        MarketingSubscription s = subscriptions.subscribe("a@b.vn", null, "NEWSLETTER");
        var firstConsent = s.getConsentedAt();
        assertTrue(subscriptions.unsubscribe(s.getUnsubscribeToken()));
        assertFalse(subscriptions.isSubscribed("a@b.vn"));
        assertFalse(subscriptions.unsubscribe("../../etc/passwd"));

        Thread.sleep(5);
        MarketingSubscription again = subscriptions.subscribe("a@b.vn", "u9", "ACCOUNT");
        assertTrue(again.isSubscribed());
        assertEquals("ACCOUNT", again.getSource());
        assertTrue(again.getConsentedAt().isAfter(firstConsent));
        assertEquals("u9", again.getUserId());
    }

    @Test
    void noConsentNoEmail() {
        var outcome = mailer(true).send(MarketingMessage.Kind.CAMPAIGN, "stranger@b.vn", null, "Sale", "<p>hi</p>", 1L, null);
        assertFalse(outcome.sent());
        assertEquals("NOT_SUBSCRIBED", outcome.reason());
        verifyNoInteractions(mailService);
    }

    @Test
    void consentedEmailCarriesUnsubscribeLinkAndHeaderAndIsRecorded() {
        MarketingSubscription s = subscriptions.subscribe("a@b.vn", "u1", "NEWSLETTER");
        EmailLog log = new EmailLog();
        log.setStatus("SENT");
        log.setTrackingToken("tok123tok123tok123");
        when(mailService.sendHtml(anyString(), anyString(), anyString(), anyMap())).thenReturn(log);

        var outcome = mailer(true).send(MarketingMessage.Kind.CAMPAIGN, "A@B.vn", "u1", "Sale", "<p>hi</p>", 7L, 3L);

        assertTrue(outcome.sent());
        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, String>> headers = ArgumentCaptor.forClass(Map.class);
        verify(mailService).sendHtml(eq("a@b.vn"), eq("Sale"), html.capture(), headers.capture());
        String url = "https://shop.test/unsubscribe?token=" + s.getUnsubscribeToken();
        assertTrue(html.getValue().contains(url));
        assertEquals("<" + url + ">", headers.getValue().get("List-Unsubscribe"));

        ArgumentCaptor<MarketingMessage> saved = ArgumentCaptor.forClass(MarketingMessage.class);
        verify(messages).save(saved.capture());
        assertEquals(7L, saved.getValue().getCampaignId());
        assertEquals("tok123tok123tok123", saved.getValue().getEmailTrackingToken());
        assertEquals(MarketingMessage.Channel.EMAIL, saved.getValue().getChannel());
    }

    @Test
    void unsubscribedAfterQueuingIsSkippedAtSendTime() {
        MarketingSubscription s = subscriptions.subscribe("a@b.vn", null, "NEWSLETTER");
        subscriptions.unsubscribe(s.getUnsubscribeToken());
        assertFalse(mailer(true).send(MarketingMessage.Kind.CAMPAIGN, "a@b.vn", null, "S", "b", 1L, null).sent());
        verifyNoInteractions(mailService);
    }

    @Test
    void switchedOffMailerSendsNothing() {
        subscriptions.subscribe("a@b.vn", null, "NEWSLETTER");
        assertEquals("EMAIL_DISABLED", mailer(false).send(MarketingMessage.Kind.CAMPAIGN, "a@b.vn", null, "S", "b", 1L, null).reason());
        verifyNoInteractions(mailService);
    }
}
