package com.nguyenhoanglong;

import com.nguyenhoanglong.constant.PermissionConstants;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * The store-owner promotions page lists and creates vouchers through /api/marketing/admin/vouchers.
 * MarketingService already lets owners apply voucher changes directly, but the controller only
 * accepted MANAGE_CAMPAIGN_PROMO (marketing staff), so the owner page got 403.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class OwnerVoucherAccessIntegrationTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void ownerWithPromoApprovalListsAndCreatesVouchers() throws Exception {
        var owner = user("owner-voucher@test.local").roles("SHOP_OWNER").authorities(
                new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_SHOP_OWNER"),
                new org.springframework.security.core.authority.SimpleGrantedAuthority(PermissionConstants.APPROVE_SHOP_PROMO));
        mockMvc.perform(get("/api/marketing/admin/vouchers").with(owner)).andExpect(status().isOk());
        mockMvc.perform(post("/api/marketing/admin/vouchers").with(owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"OWNERTEST10\",\"name\":\"Owner test\",\"discountType\":\"PERCENTAGE\",\"discountValue\":10}"))
                .andExpect(status().isCreated());
    }

    @Test
    void salesStaffStillCannotManageVouchers() throws Exception {
        mockMvc.perform(get("/api/marketing/admin/vouchers").with(user("sales-voucher@test.local").roles("SALES_STAFF")))
                .andExpect(status().isForbidden());
    }
}
