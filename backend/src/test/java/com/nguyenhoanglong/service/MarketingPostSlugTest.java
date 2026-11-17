package com.nguyenhoanglong.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MarketingPostSlugTest {

    @Test
    void vietnameseTitleKeepsItsWords() {
        assertThat(MarketingService.postSlug("Bộ sưu tập mùa đông 2026!")).isEqualTo("bo-suu-tap-mua-dong-2026");
        assertThat(MarketingService.postSlug("  Đồ đôi Đẹp  ")).isEqualTo("do-doi-dep");
        assertThat(MarketingService.postSlug("!!!")).isEmpty();
    }
}
