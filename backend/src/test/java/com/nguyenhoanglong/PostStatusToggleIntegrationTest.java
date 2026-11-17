package com.nguyenhoanglong;

import com.nguyenhoanglong.entity.MarketingPost;
import com.nguyenhoanglong.repository.MarketingPostRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The post list's publish toggle called PATCH /posts/{id}/status, which did not exist. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PostStatusToggleIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private MarketingPostRepository postRepository;

    @Test
    void marketingStaffPublishesFromTheList() throws Exception {
        MarketingPost p = new MarketingPost();
        p.setTitle("Bài thử " + System.nanoTime());
        p.setSlug("bai-thu-" + System.nanoTime());
        p.setStatus("DRAFT");
        p = postRepository.save(p);

        mockMvc.perform(patch("/api/staff/marketing/posts/" + p.getId() + "/status")
                        .with(user("mkt@test.local").authorities(
                                new org.springframework.security.core.authority.SimpleGrantedAuthority("MANAGE_CAMPAIGN_PROMO")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isOk());

        MarketingPost saved = postRepository.findById(p.getId()).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo("PUBLISHED");
        assertThat(saved.getPublishedAt()).isNotNull();
    }
}
