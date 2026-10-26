package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.ProductDto;
import com.nguyenhoanglong.repository.UserBehaviorEventRepository;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class HomeRecommendationServiceTest {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final UserBehaviorEventRepository events = mock(UserBehaviorEventRepository.class);
    private final ProductService productService = mock(ProductService.class);
    private final HomeRecommendationService service = new HomeRecommendationService(jdbc, events, productService);

    private static ProductDto dto(long id) {
        ProductDto d = new ProductDto();
        d.setId(id);
        d.setSlug("p" + id);
        return d;
    }

    private static List<Long> ids(List<ProductDto> products) {
        return products.stream().map(ProductDto::getId).toList();
    }

    @Test
    void trendingUsesTheLastWeekWhenItIsBusyEnough() {
        when(jdbc.queryForList(anyString(), eq(Long.class), any(), eq(2))).thenReturn(List.of(5L, 6L));
        when(productService.getActiveProductsInOrder(List.of(5L, 6L))).thenReturn(List.of(dto(5), dto(6)));

        var result = service.trending(2);

        assertEquals(7, result.windowDays());
        assertEquals(List.of(5L, 6L), ids(result.products()));
        verify(jdbc, times(1)).queryForList(anyString(), eq(Long.class), any(), eq(2));
    }

    @Test
    void trendingWidensToAMonthWhenTheWeekIsQuiet() {
        when(jdbc.queryForList(anyString(), eq(Long.class), any(), eq(2)))
                .thenReturn(List.of(5L))
                .thenReturn(List.of(5L, 6L));
        when(productService.getActiveProductsInOrder(List.of(5L))).thenReturn(List.of(dto(5)));
        when(productService.getActiveProductsInOrder(List.of(5L, 6L))).thenReturn(List.of(dto(5), dto(6)));

        var result = service.trending(2);

        assertEquals(30, result.windowDays());
        assertEquals(List.of(5L, 6L), ids(result.products()));
    }

    @Test
    void trendingIsCachedForEveryone() {
        when(jdbc.queryForList(anyString(), eq(Long.class), any(), anyInt())).thenReturn(List.of(5L, 6L, 7L));
        when(productService.getActiveProductsInOrder(anyList())).thenReturn(List.of(dto(5), dto(6), dto(7)));

        service.trending(3);
        var smaller = service.trending(2);

        assertEquals(List.of(5L, 6L), ids(smaller.products()));
        verify(jdbc, times(1)).queryForList(anyString(), eq(Long.class), any(), anyInt());
    }

    @Test
    void becauseYouViewedAnchorsOnTheLastViewedProductAndSkipsWhatWasSeen() {
        // newest first, with a repeat
        when(events.findRecentProductIds(eq("u1"), eq(List.of("VIEW")), any())).thenReturn(List.of(3L, 2L, 3L));
        when(productService.getActiveProductsInOrder(List.of(3L))).thenReturn(List.of(dto(3)));
        when(productService.getSimilarProducts(eq("p3"), anyInt())).thenReturn(List.of(dto(2), dto(8), dto(9)));

        var result = service.becauseYouViewed("u1", 4);

        assertEquals(3L, result.anchor().getId());
        assertEquals(List.of(8L, 9L), ids(result.products()));
    }

    @Test
    void becauseYouViewedSkipsAnchorsThatAreNoLongerOnSale() {
        when(events.findRecentProductIds(eq("u1"), anyList(), any())).thenReturn(List.of(3L, 2L));
        when(productService.getActiveProductsInOrder(List.of(3L))).thenReturn(List.of());
        when(productService.getActiveProductsInOrder(List.of(2L))).thenReturn(List.of(dto(2)));
        when(productService.getSimilarProducts(eq("p2"), anyInt())).thenReturn(List.of(dto(8)));

        assertEquals(2L, service.becauseYouViewed("u1", 4).anchor().getId());
    }

    @Test
    void noHistoryMeansNoPersonalSections() {
        when(events.findRecentProductIds(eq("u1"), anyList(), any())).thenReturn(List.of());

        assertNull(service.becauseYouViewed("u1", 4).anchor());
        assertTrue(service.recentlyViewed("u1", 4).isEmpty());
        assertNull(service.becauseYouViewed(null, 4).anchor());
        assertTrue(service.recentlyViewed(null, 4).isEmpty());
    }

    @Test
    void recentlyViewedIsDistinctNewestFirst() {
        when(events.findRecentProductIds(eq("u1"), anyList(), any())).thenReturn(List.of(3L, 2L, 3L, 1L));
        when(productService.getActiveProductsInOrder(List.of(3L, 2L, 1L))).thenReturn(List.of(dto(3), dto(2), dto(1)));

        assertEquals(List.of(3L, 2L), ids(service.recentlyViewed("u1", 2)));
    }
}
