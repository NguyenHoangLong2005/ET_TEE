package com.nguyenhoanglong;

import com.nguyenhoanglong.service.AiFeatureFlags;
import com.nguyenhoanglong.service.AiFeatureFlags.Flag;
import com.nguyenhoanglong.service.CartComplementService;
import com.nguyenhoanglong.service.ForYouService;
import com.nguyenhoanglong.service.SemanticSearchService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;

/** Co tinh nang AI la cong tac that: tat thi chuc nang tuong ung khong chay mo hinh nua. */
@SpringBootTest
@ActiveProfiles("test")
class AiFeatureFlagsIntegrationTest {

    @Autowired private AiFeatureFlags flags;
    @Autowired private ForYouService forYou;
    @Autowired private CartComplementService cartComplements;
    @Autowired private SemanticSearchService search;

    @AfterEach
    void turnEverythingBackOn() {
        for (Flag f : Flag.values()) flags.set(f, true);
    }

    @Test
    void listsTheFourFixedSwitchesOnByDefault() {
        var list = flags.list();
        assertEquals(Flag.values().length, list.size());
        assertTrue(list.stream().allMatch(AiFeatureFlags.FlagState::enabled));
    }

    @Test
    void forYouOffReturnsNothing() {
        flags.set(Flag.FOR_YOU, false);
        var r = forYou.recommend("guest:any-key", 12);
        assertEquals(ForYouService.Strategy.NONE, r.strategy());
        assertTrue(r.products().isEmpty());
    }

    @Test
    void cartComplementsOffReturnsNothing() {
        flags.set(Flag.CART_COMPLEMENTS, false);
        var r = cartComplements.forCart(null, "no-such-guest-token", 4);
        assertNull(r.model());
        assertTrue(r.items().isEmpty());
    }

    @Test
    void smartSearchOffFallsBackToKeywordAndBlocksImageSearch() {
        flags.set(Flag.SMART_SEARCH, false);
        assertEquals(SemanticSearchService.Strategy.KEYWORD, search.search("áo thun", 5).strategy());
        var ex = assertThrows(ResponseStatusException.class,
                () -> search.searchByImage(new byte[]{1, 2, 3}, "a.jpg", "image/jpeg", 5));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatusCode());
    }

    @Test
    void stateSurvivesAFreshRead() {
        flags.set(Flag.OUTFIT, false);
        assertFalse(flags.isEnabled(Flag.OUTFIT));
        assertFalse(flags.list().stream().filter(s -> s.key().equals(Flag.OUTFIT.key)).findFirst().orElseThrow().enabled());
    }
}
