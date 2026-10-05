package com.nguyenhoanglong;

import com.nguyenhoanglong.entity.MarketingMessage;
import com.nguyenhoanglong.entity.Role;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.entity.Voucher;
import com.nguyenhoanglong.repository.MarketingMessageRepository;
import com.nguyenhoanglong.repository.UserRepository;
import com.nguyenhoanglong.repository.VoucherRepository;
import com.nguyenhoanglong.service.EmailCampaignService;
import com.nguyenhoanglong.service.LifecycleMarketingService;
import com.nguyenhoanglong.service.MarketingSubscriptionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** The lifecycle / audience SQL against a real database (H2), not mocks. */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MarketingLifecycleIntegrationTest {

    @Autowired private LifecycleMarketingService lifecycle;
    @Autowired private EmailCampaignService campaigns;
    @Autowired private MarketingSubscriptionService subscriptions;
    @Autowired private UserRepository users;
    @Autowired private VoucherRepository vouchers;
    @Autowired private MarketingMessageRepository messages;
    @Autowired private JdbcTemplate jdbc;

    private User user(String email, boolean verified) {
        return users.saveAndFlush(User.builder().fullName(email).email(email).passwordHash("x").role(Role.USER)
                .status("ACTIVE").emailVerified(verified).build());
    }

    @Test
    void welcomeVoucherOncePerNewVerifiedAccountAndNoBackfill() {
        User fresh = user("fresh-" + System.nanoTime() + "@test.local", true);
        User unverified = user("unverified-" + System.nanoTime() + "@test.local", false);
        User old = user("old-" + System.nanoTime() + "@test.local", true);
        jdbc.update("UPDATE users SET created_at = ? WHERE id = ?", Timestamp.valueOf(LocalDateTime.now().minusDays(30)), old.getId());

        lifecycle.runWelcome();
        lifecycle.runWelcome();                                   // second pass must not issue again

        List<Voucher> mine = vouchers.findPersonalActive(fresh.getId(), LocalDateTime.now());
        assertEquals(1, mine.size());
        assertTrue(mine.get(0).getCode().startsWith("WELCOME-"));
        assertEquals("NEW_CUSTOMER", mine.get(0).getTargetGroup());
        assertTrue(messages.existsByUserIdAndKind(fresh.getId(), MarketingMessage.Kind.WELCOME));

        assertTrue(vouchers.findPersonalActive(unverified.getId(), LocalDateTime.now()).isEmpty());
        assertTrue(vouchers.findPersonalActive(old.getId(), LocalDateTime.now()).isEmpty());
    }

    @Test
    void campaignAudienceIsConsentNotShop() {
        User member = user("member-" + System.nanoTime() + "@test.local", true);
        User silent = user("silent-" + System.nanoTime() + "@test.local", true);
        subscriptions.subscribe(member.getEmail(), member.getId(), MarketingSubscriptionService.SOURCE_ACCOUNT);
        String guestEmail = "guest-" + System.nanoTime() + "@test.local";
        subscriptions.subscribe(guestEmail, null, MarketingSubscriptionService.SOURCE_NEWSLETTER);

        var all = campaigns.audience(EmailCampaignService.Segment.ALL_SUBSCRIBERS).stream()
                .map(EmailCampaignService.Recipient::email).toList();
        assertTrue(all.contains(member.getEmail().toLowerCase()));
        assertTrue(all.contains(guestEmail));                     // newsletter guests have no account and no shop
        assertFalse(all.contains(silent.getEmail().toLowerCase()));

        var fresh = campaigns.audience(EmailCampaignService.Segment.NEW_CUSTOMERS).stream()
                .map(EmailCampaignService.Recipient::email).toList();
        assertTrue(fresh.contains(member.getEmail().toLowerCase()));  // account, no orders yet
        assertFalse(fresh.contains(guestEmail));                       // no account: not classifiable
    }
}
