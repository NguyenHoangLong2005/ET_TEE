package com.nguyenhoanglong;

import com.nguyenhoanglong.controller.staff.StaffMarketingController;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import com.nguyenhoanglong.service.MarketingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class StaffMarketingIntegrationTest {

    @Autowired
    private MarketingService marketingService;

    @Autowired
    private StaffMarketingController staffMarketingController;

    @Autowired
    private CampaignRepository campaignRepository;

    @Autowired
    private VoucherRepository voucherRepository;

    @Autowired
    private MarketingPostRepository marketingPostRepository;

    @Autowired
    private ProductPlacementRepository productPlacementRepository;

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("Case 1: Campaign date validation - endDate before startDate throws 400")
    public void testCampaignDateValidation() {
        Campaign campaign = new Campaign();
        campaign.setName("Invalid Date Campaign");
        campaign.setCode("CAMP-DATE-ERR");
        campaign.setStartDate(LocalDateTime.now().plusDays(5));
        campaign.setEndDate(LocalDateTime.now().plusDays(2)); // before start date!

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            marketingService.createCampaign(campaign, "staff@et.tee");
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Ngày bắt đầu phải trước ngày kết thúc"));
    }

    @Test
    @DisplayName("Case 2: Campaign status transition state machine")
    public void testCampaignStatusTransitions() {
        Campaign campaign = new Campaign();
        campaign.setName("State Machine Campaign " + System.currentTimeMillis());
        campaign.setCode("CAMP-SM-" + System.currentTimeMillis());
        campaign.setStartDate(LocalDateTime.now().minusDays(1));
        campaign.setEndDate(LocalDateTime.now().plusDays(5));
        campaign.setStatus("SCHEDULED");

        Campaign created = marketingService.createCampaign(campaign, "staff@et.tee");
        assertNotNull(created.getId());

        // Valid transition: SCHEDULED -> ACTIVE
        Campaign activated = marketingService.updateCampaignStatus(created.getId(), "ACTIVE", "staff@et.tee");
        assertEquals("ACTIVE", activated.getStatus());

        // Valid transition: ACTIVE -> PAUSED
        Campaign paused = marketingService.updateCampaignStatus(created.getId(), "PAUSED", "staff@et.tee");
        assertEquals("PAUSED", paused.getStatus());

        // Valid transition: PAUSED -> ACTIVE
        Campaign resumed = marketingService.updateCampaignStatus(created.getId(), "ACTIVE", "staff@et.tee");
        assertEquals("ACTIVE", resumed.getStatus());

        // Valid transition: ACTIVE -> COMPLETED
        Campaign completed = marketingService.updateCampaignStatus(created.getId(), "COMPLETED", "staff@et.tee");
        assertEquals("COMPLETED", completed.getStatus());

        // Invalid transition: COMPLETED -> ACTIVE must fail
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            marketingService.updateCampaignStatus(created.getId(), "ACTIVE", "staff@et.tee");
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Không thể chuyển"));
    }

    @Test
    @DisplayName("Case 3: Voucher validation - percentage > 100 or non-positive value throws 400")
    public void testVoucherValidation() {
        Voucher invalidPercent = new Voucher();
        invalidPercent.setCode("VOUCH-OVER100-" + System.currentTimeMillis());
        invalidPercent.setName("Invalid 120%");
        invalidPercent.setType("PERCENT");
        invalidPercent.setDiscountValue(new BigDecimal("120.00"));
        invalidPercent.setStartDate(LocalDateTime.now().minusDays(1));
        invalidPercent.setEndDate(LocalDateTime.now().plusDays(10));

        ResponseStatusException ex1 = assertThrows(ResponseStatusException.class, () -> {
            marketingService.createVoucher(invalidPercent, "staff@et.tee");
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex1.getStatusCode());
        assertTrue(ex1.getReason().contains("100%"));

        Voucher invalidFixed = new Voucher();
        invalidFixed.setCode("VOUCH-ZERO-" + System.currentTimeMillis());
        invalidFixed.setName("Zero Fixed");
        invalidFixed.setType("FIXED_AMOUNT");
        invalidFixed.setDiscountValue(BigDecimal.ZERO);
        invalidFixed.setStartDate(LocalDateTime.now().minusDays(1));
        invalidFixed.setEndDate(LocalDateTime.now().plusDays(10));

        ResponseStatusException ex2 = assertThrows(ResponseStatusException.class, () -> {
            marketingService.createVoucher(invalidFixed, "staff@et.tee");
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex2.getStatusCode());
        assertTrue(ex2.getReason().contains("lớn hơn 0"));
    }

    @Test
    @DisplayName("Case 4: Shop-specific voucher routes to PENDING_APPROVAL")
    public void testShopSpecificVoucherPendingApproval() {
        Voucher shopVoucher = new Voucher();
        shopVoucher.setCode("SHOP1-PROMO-" + System.currentTimeMillis());
        shopVoucher.setName("Shop 1 Promo");
        shopVoucher.setType("PERCENT");
        shopVoucher.setDiscountValue(new BigDecimal("15.00"));
        shopVoucher.setStartDate(LocalDateTime.now().minusDays(1));
        shopVoucher.setEndDate(LocalDateTime.now().plusDays(10));
        // A real store owner of a real shop: "storeowner@et.tee" never existed, so the creator was
        // unknown, treated as marketing staff, and the voucher lost its shopId.
        Shop shop = new Shop();
        shop.setName("Shop voucher test " + System.currentTimeMillis());
        shop.setIsActive(true);
        shop = shopRepository.save(shop);
        String ownerEmail = "owner-voucher-" + System.currentTimeMillis() + "@test.local";
        userRepository.save(User.builder()
                .fullName("Chủ shop test").email(ownerEmail).passwordHash("x")
                .role(Role.SHOP_OWNER).shopId(shop.getId()).status("ACTIVE").emailVerified(true)
                .build());
        shopVoucher.setShopId(shop.getId());

        Voucher created = marketingService.createVoucher(shopVoucher, ownerEmail);
        assertEquals("PENDING_APPROVAL", created.getStatus());
        assertEquals(shop.getId(), created.getShopId());
    }

    @Test
    @DisplayName("Case 5: Marketing Post CRUD lifecycle")
    public void testMarketingPostCrud() {
        MarketingPost post = new MarketingPost();
        String slug = "xu-huong-thoi-trang-" + System.currentTimeMillis();
        post.setTitle("Xu hướng thời trang mùa hè");
        post.setSlug(slug);
        post.setExcerpt("Bài viết về xu hướng thời trang mùa hè năng động");
        post.setContent("<p>Nội dung bài viết chi tiết...</p>");
        post.setCoverImageUrl("https://cdn.et-tee.com/summer-post.jpg");
        post.setStatus("DRAFT");
        post.setTags(List.of("fashion", "summer", "trends"));

        MarketingPost saved = marketingService.createPost(post, "staff@et.tee");
        assertNotNull(saved.getId());
        assertEquals("DRAFT", saved.getStatus());
        assertEquals(3, saved.getTags().size());

        // Update post
        saved.setTitle("Xu hướng thời trang hè thu mới nhất");
        saved.setStatus("PUBLISHED");
        MarketingPost updated = marketingService.updatePost(saved.getId(), saved, "staff@et.tee");
        assertEquals("PUBLISHED", updated.getStatus());
        assertNotNull(updated.getPublishedAt());

        // Retrieve post
        Optional<MarketingPost> found = marketingService.getPostById(saved.getId());
        assertTrue(found.isPresent());
        assertEquals("Xu hướng thời trang hè thu mới nhất", found.get().getTitle());

        // Delete post
        marketingService.deletePost(saved.getId());
        Optional<MarketingPost> deleted = marketingService.getPostById(saved.getId());
        assertFalse(deleted.isPresent());
    }

    @Test
    @DisplayName("Case 6: Product Placement reordering")
    public void testProductPlacementReordering() {
        // Setup 2 placements
        ProductPlacement p1 = new ProductPlacement();
        p1.setPlacementKey("HOME_FEATURED");
        p1.setProductId(1L);
        p1.setPosition(1);
        p1.setStatus("ACTIVE");
        p1 = productPlacementRepository.save(p1);

        ProductPlacement p2 = new ProductPlacement();
        p2.setPlacementKey("HOME_FEATURED");
        p2.setProductId(2L);
        p2.setPosition(2);
        p2.setStatus("ACTIVE");
        p2 = productPlacementRepository.save(p2);

        // Reorder p2 first (becomes position 1), then p1 (becomes position 2)
        marketingService.reorderPlacements("HOME_FEATURED", List.of(p2.getId(), p1.getId()));

        ProductPlacement refreshed1 = productPlacementRepository.findById(p1.getId()).orElseThrow();
        ProductPlacement refreshed2 = productPlacementRepository.findById(p2.getId()).orElseThrow();

        assertEquals(2, refreshed1.getPosition());
        assertEquals(1, refreshed2.getPosition());
    }

    @Test
    @DisplayName("Case 7: Analytics overview endpoint returns valid live structure")
    public void testAnalyticsOverviewEndpoint() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("marketing@et.tee", "pwd", List.of(
                        new SimpleGrantedAuthority("VIEW_CAMPAIGN_ANALYTICS"),
                        new SimpleGrantedAuthority("MANAGE_CAMPAIGN_PROMO")
                ))
        );
        try {
            ResponseEntity<?> response = staffMarketingController.getAnalyticsOverview(null);
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertNotNull(response.getBody());

            Map<?, ?> body = (Map<?, ?>) response.getBody();
            assertTrue(body.containsKey("overview"));
            assertTrue(body.containsKey("topVouchers"));
            assertTrue(body.containsKey("campaignPerformances"));

            Map<?, ?> overview = (Map<?, ?>) body.get("overview");
            assertTrue(overview.containsKey("activeCampaigns"));
            assertTrue(overview.containsKey("activeVouchers"));
            assertTrue(overview.containsKey("totalRedemptions"));
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
