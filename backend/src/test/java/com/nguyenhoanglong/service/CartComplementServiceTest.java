package com.nguyenhoanglong.service;

import com.nguyenhoanglong.repository.CartRepository;
import com.nguyenhoanglong.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.nguyenhoanglong.service.CartComplementService.Source.POPULAR_SEGMENT;
import static com.nguyenhoanglong.service.CartComplementService.Source.RULE;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class CartComplementServiceTest {

    private final CartComplementService service = new CartComplementService(
            mock(JdbcTemplate.class), mock(CartRepository.class), mock(UserRepository.class), mock(ProductService.class));

    @BeforeEach
    void rules() {
        service.install(List.of(
                        new CartComplementService.Rule(Set.of("men:pants"), "men:tshirt", 0.21 * 2.11),
                        new CartComplementService.Rule(Set.of("men:pants"), "men:polo", 0.11 * 2.52),
                        new CartComplementService.Rule(Set.of("men:polo"), "men:pants", 0.19 * 2.52),
                        new CartComplementService.Rule(Set.of("men:pants", "men:shirt"), "men:outerwear", 0.5)),
                List.of("women:tshirt", "men:tshirt", "unisex:accessories", "men:shorts", "kids:tshirt"),
                "test");
    }

    @Test
    void segmentMappingMatchesTheMiningScript() {
        assertEquals("men:pants", CartComplementService.segmentOf("MEN", "Pants"));
        assertEquals("unisex:accessories", CartComplementService.segmentOf("accessories", "accessories"));
        assertEquals("unisex:tshirt", CartComplementService.segmentOf("family", "tshirt"));
        assertEquals("unisex:other", CartComplementService.segmentOf(null, null));
    }

    @Test
    void rulesRankByConfidenceTimesLiftThenBackOffWithinTheCartsGroup() {
        Map<String, CartComplementService.Source> segments = service.chooseSegments(Set.of("men:pants"));

        // men:tshirt 0.443 > men:polo 0.277; third slot backs off to best sellers of men / unisex
        // (women:tshirt is the top seller overall but the wrong customer group)
        assertEquals(List.of("men:tshirt", "men:polo", "unisex:accessories"), List.copyOf(segments.keySet()));
        assertEquals(List.of(RULE, RULE, POPULAR_SEGMENT), List.copyOf(segments.values()));
    }

    @Test
    void multiItemAntecedentNeedsTheWholeAntecedentInTheCart() {
        assertTrue(service.chooseSegments(Set.of("men:pants", "men:shirt")).containsKey("men:outerwear"));
        assertFalse(service.chooseSegments(Set.of("men:pants")).containsKey("men:outerwear"));
    }

    @Test
    void segmentsAlreadyInTheCartAreNeverSuggested() {
        Map<String, CartComplementService.Source> segments = service.chooseSegments(Set.of("men:pants", "men:tshirt"));
        assertFalse(segments.containsKey("men:tshirt"));
        assertFalse(segments.containsKey("men:pants"));
    }

    @Test
    void cartWithoutMatchingRulesStillGetsSuggestions() {
        Map<String, CartComplementService.Source> segments = service.chooseSegments(Set.of("kids:shorts"));
        // best-seller order, kids + unisex only
        assertEquals(List.of("unisex:accessories", "kids:tshirt"), List.copyOf(segments.keySet()));
        assertTrue(segments.values().stream().allMatch(s -> s == POPULAR_SEGMENT));
    }
}
