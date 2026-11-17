package com.nguyenhoanglong.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitFilterTest {

    private static int post(RateLimitFilter filter, String uri, String ip) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", uri);
        req.setRemoteAddr(ip);
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        return res.getStatus();
    }

    @Test
    void newsletterSignUpsAreLimitedPerAddress() throws Exception {
        RateLimitFilter filter = new RateLimitFilter();
        for (int i = 0; i < 5; i++) {
            assertThat(post(filter, "/api/public/newsletter", "203.0.113.7")).isEqualTo(200);
        }
        assertThat(post(filter, "/api/public/newsletter", "203.0.113.7")).isEqualTo(429);
        // another visitor is not affected
        assertThat(post(filter, "/api/public/newsletter", "203.0.113.8")).isEqualTo(200);
    }

    @Test
    void checkoutIsLimitedPerAddress() throws Exception {
        RateLimitFilter filter = new RateLimitFilter();
        for (int i = 0; i < 20; i++) {
            assertThat(post(filter, "/api/orders/checkout", "203.0.113.9")).isEqualTo(200);
        }
        assertThat(post(filter, "/api/orders/checkout", "203.0.113.9")).isEqualTo(429);
    }
}
