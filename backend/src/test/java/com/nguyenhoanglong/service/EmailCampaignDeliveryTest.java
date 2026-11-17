package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.EmailCampaign;
import com.nguyenhoanglong.repository.EmailCampaignRepository;
import com.nguyenhoanglong.repository.MarketingMessageRepository;
import com.nguyenhoanglong.repository.VoucherRepository;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** A failure outside the per-recipient loop used to leave the campaign in SENDING forever. */
class EmailCampaignDeliveryTest {

    private final EmailCampaignRepository campaigns = mock(EmailCampaignRepository.class);
    private final MarketingMessageRepository messages = mock(MarketingMessageRepository.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final EmailCampaignService service = new EmailCampaignService(campaigns, messages,
            mock(VoucherRepository.class), mock(MarketingMailer.class), jdbc, Runnable::run, "http://shop.test");

    private EmailCampaign sending() {
        EmailCampaign c = new EmailCampaign();
        c.setSegment("ALL_SUBSCRIBERS");
        c.setStatus("SENDING");
        return c;
    }

    @Test
    void nothingSentGoesBackToDraft() {
        when(jdbc.queryForList(anyString())).thenThrow(new RuntimeException("db down"));
        when(messages.countByCampaignAndStatus(any(), eq("SENT"))).thenReturn(0L);
        EmailCampaign c = sending();

        service.deliver(c, null);

        assertThat(c.getStatus()).isEqualTo("DRAFT");
        verify(campaigns).save(c);
    }

    @Test
    void partlySentIsMarkedFailed() {
        when(jdbc.queryForList(anyString())).thenThrow(new RuntimeException("db down"));
        when(messages.countByCampaignAndStatus(any(), eq("SENT"))).thenReturn(12L);
        EmailCampaign c = sending();

        service.deliver(c, null);

        assertThat(c.getStatus()).isEqualTo("FAILED");
        assertThat(c.getRecipients()).isEqualTo(12);
    }
}
