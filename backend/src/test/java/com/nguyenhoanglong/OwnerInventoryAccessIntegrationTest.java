package com.nguyenhoanglong;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * The store-owner inventory page (web store-owner/inventory, app /owner/inventory) reads stock and
 * receives goods through /api/staff/warehouse. SHOP_OWNER holds none of the warehouse permissions,
 * so the page used to get 403 on every call. The owner may view and receive stock, nothing more:
 * picking, packing and handover stay with warehouse staff.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class OwnerInventoryAccessIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private ShopRepository shopRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private User owner;
    private Product product;

    @BeforeEach
    void setUp() {
        Shop shop = new Shop();
        shop.setName("Chi nhánh kho");
        shop.setIsActive(true);
        shop = shopRepository.save(shop);
        owner = userRepository.save(User.builder()
                .fullName("Chủ kho").email("owner-inv@test.local").passwordHash(passwordEncoder.encode("Test@12345"))
                .role(Role.SHOP_OWNER).shopId(shop.getId()).status("ACTIVE").emailVerified(true).build());
        Product p = new Product();
        long sfx = System.nanoTime();
        p.setName("Áo nhập kho " + sfx);
        p.setSlug("ao-nhap-kho-" + sfx);
        p.setPrice(new BigDecimal("100000"));
        p.setStatus("ACTIVE");
        product = productRepository.save(p);
    }

    @Test
    void ownerSeesStockAndReceivesGoods() throws Exception {
        mockMvc.perform(get("/api/staff/warehouse/inventory").with(user(owner.getEmail()).roles("SHOP_OWNER")))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/staff/warehouse/products").with(user(owner.getEmail()).roles("SHOP_OWNER")))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/staff/warehouse/inbound").with(user(owner.getEmail()).roles("SHOP_OWNER")))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/staff/warehouse/inbound")
                        .with(user(owner.getEmail()).roles("SHOP_OWNER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("productId", product.getId(), "quantity", 5))))
                .andExpect(status().isOk());
    }

    @Test
    void ownerCannotRunFulfillment() throws Exception {
        mockMvc.perform(post("/api/staff/warehouse/orders/1/picking").with(user(owner.getEmail()).roles("SHOP_OWNER")))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/staff/warehouse/orders/1/handover").with(user(owner.getEmail()).roles("SHOP_OWNER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void customerStaysOut() throws Exception {
        mockMvc.perform(get("/api/staff/warehouse/inventory").with(user("someone@test.local").roles("USER")))
                .andExpect(status().isForbidden());
    }
}
