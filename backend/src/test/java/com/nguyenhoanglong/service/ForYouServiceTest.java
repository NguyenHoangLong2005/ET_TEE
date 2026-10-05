package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.ProductDto;
import com.nguyenhoanglong.recsys.SasrecModel;
import com.nguyenhoanglong.repository.ProductRepository;
import com.nguyenhoanglong.repository.UserBehaviorEventRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ForYouServiceTest {

    private final UserBehaviorEventRepository events = mock(UserBehaviorEventRepository.class);
    private final ProductRepository products = mock(ProductRepository.class);
    private final ProductService productService = mock(ProductService.class);
    private final SasrecModel model = mock(SasrecModel.class);
    private final ForYouService service = new ForYouService(events, products, productService, model);

    private static ProductDto dto(long id) {
        ProductDto d = new ProductDto();
        d.setId(id);
        return d;
    }

    @Test
    void noHistoryMeansNoPersonalisedFeed() {
        when(events.findRecentProductIds(eq("u1"), anyList(), any())).thenReturn(List.of());

        var result = service.recommend("u1", 12);

        assertEquals(ForYouService.Strategy.NONE, result.strategy());
        assertTrue(result.products().isEmpty());
        verifyNoInteractions(model);
    }

    @Test
    void unknownShopperGetsNothing() {
        assertEquals(ForYouService.Strategy.NONE, service.recommend(null, 12).strategy());
    }

    @Test
    void sasrecGetsTheChronologicalSequenceAndExcludesWhatWasJustSeen() {
        // repository answers most recent first
        when(events.findRecentProductIds(eq("u1"), anyList(), any())).thenReturn(List.of(3L, 2L, 1L));
        when(model.isAvailable()).thenReturn(true);
        when(model.toSequence(List.of(1L, 2L, 3L))).thenReturn(List.of(1L, 2L, 3L));
        when(model.recommend(eq(List.of(1L, 2L, 3L)), eq(4), anySet())).thenReturn(List.of(9L, 8L));
        when(productService.getActiveProductsInOrder(List.of(9L, 8L))).thenReturn(List.of(dto(9), dto(8)));
        when(model.version()).thenReturn("SASRec test");

        var result = service.recommend("u1", 2);

        assertEquals(ForYouService.Strategy.SASREC, result.strategy());
        assertEquals(List.of(9L, 8L), result.products().stream().map(ProductDto::getId).toList());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Set<Long>> exclude = ArgumentCaptor.forClass(Set.class);
        verify(model).recommend(anyList(), anyInt(), exclude.capture());
        assertEquals(Set.of(1L, 2L, 3L), exclude.getValue());
        verifyNoInteractions(products);
    }

    @Test
    void fallsBackToClipWhenNoModelIsLoaded() {
        when(events.findRecentProductIds(eq("u1"), anyList(), any())).thenReturn(List.of(3L, 3L, 2L, 1L));
        when(model.isAvailable()).thenReturn(false);
        when(products.findNearestToMeanEmbedding(anyList(), anyList(), eq(12))).thenReturn(List.of(7L));
        when(productService.getActiveProductsInOrder(List.of(7L))).thenReturn(List.of(dto(7)));

        var result = service.recommend("u1", 12);

        assertEquals(ForYouService.Strategy.CLIP_RECENT, result.strategy());
        verify(products).enableHnswIterativeScan();
        // last distinct items, most recent first
        verify(products).findNearestToMeanEmbedding(eq(List.of(3L, 2L, 1L)), anyList(), eq(12));
    }

    @Test
    void historyOutsideTheModelVocabularyAlsoFallsBack() {
        when(events.findRecentProductIds(eq("u1"), anyList(), any())).thenReturn(List.of(42L));
        when(model.isAvailable()).thenReturn(true);
        when(model.toSequence(anyList())).thenReturn(List.of());
        when(products.findNearestToMeanEmbedding(anyList(), anyList(), anyInt())).thenReturn(List.of(7L));
        when(productService.getActiveProductsInOrder(List.of(7L))).thenReturn(List.of(dto(7)));

        assertEquals(ForYouService.Strategy.CLIP_RECENT, service.recommend("u1", 12).strategy());
        verify(model, never()).recommend(anyList(), anyInt(), anySet());
    }
}
