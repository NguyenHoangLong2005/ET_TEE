package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.ProductDto;
import com.nguyenhoanglong.recsys.EmbedderClient;
import com.nguyenhoanglong.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SemanticSearchServiceTest {

    private final EmbedderClient embedder = mock(EmbedderClient.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final ProductRepository products = mock(ProductRepository.class);
    private final ProductService productService = mock(ProductService.class);
    private final SemanticSearchService service = new SemanticSearchService(embedder, jdbc, products, productService);

    @Test
    void rrfRewardsItemsRankedHighInSeveralLists() {
        // 3 is 2nd in both lists -> beats 1 and 7 that each top only one list
        List<Long> fused = SemanticSearchService.rrf(List.of(List.of(1L, 3L, 5L), List.of(7L, 3L, 9L)));
        assertEquals(3L, fused.get(0));
        assertEquals(List.of(3L, 1L, 7L, 5L, 9L), fused);
    }

    @Test
    void embedderDownFallsBackToKeywordOrder() {
        when(embedder.embedText(anyString())).thenReturn(null);
        when(jdbc.queryForList(startsWith("SELECT id FROM products"), eq(Long.class), any(Object[].class)))
                .thenReturn(List.of(4L, 2L));
        when(productService.getActiveProductsInOrder(List.of(4L, 2L))).thenReturn(List.of(new ProductDto(), new ProductDto()));

        var result = service.search("quần jean", 10);

        assertEquals(SemanticSearchService.Strategy.KEYWORD, result.strategy());
        assertEquals(2, result.products().size());
        verify(products, never()).enableHnswIterativeScan();
    }

    @Test
    void everyWordMustMatchAndLikeWildcardsAreEscaped() {
        when(jdbc.queryForList(anyString(), eq(Long.class), any(Object[].class))).thenReturn(List.of());

        service.keywordIds("áo 50%_off", 5);

        verify(jdbc).queryForList(argThat((String sql) -> sql.split("LOWER\\(name\\) LIKE \\?").length == 3),
                eq(Long.class), eq(new Object[]{"%áo%", "%áo%", "%áo%", "%áo%",
                        "%50\\%\\_off%", "%50\\%\\_off%", "%50\\%\\_off%", "%50\\%\\_off%", 5}));
    }

    @Test
    void blankQueryReturnsNothingWithoutCallingAnything() {
        assertTrue(service.search("   ", 10).products().isEmpty());
        verifyNoInteractions(embedder, jdbc);
    }

    @Test
    void unreadableImageIsABadRequestNotAnOutage() {
        when(embedder.embedImage(any(), any(), any())).thenReturn(null);
        when(embedder.isCoolingDown()).thenReturn(false);

        var e = assertThrows(ResponseStatusException.class,
                () -> service.searchByImage(new byte[]{1, 2}, "x.png", "image/png", 10));
        assertEquals(400, e.getStatusCode().value());
    }

    @Test
    void keywordListWeighsDoubleInFusion() {
        // without weights 7 (top of the vector list) ties 1 (top of the keyword list); weighted, keyword wins
        List<Long> fused = SemanticSearchService.rrf(List.of(List.of(1L, 2L), List.of(7L, 8L)), List.of(2.0, 1.0));
        assertEquals(List.of(1L, 2L, 7L, 8L), fused);
    }

    @Test
    void queryVectorIsCenteredOnGenericPhrases() {
        // every generic phrase embeds to (1, 0): the centre is (1, 0) and is subtracted from the query
        when(embedder.embedText(anyString())).thenReturn(new float[]{1f, 0f});
        service.loadCenter();
        float[] out = service.centered(new float[]{3f, 2f});
        assertArrayEquals(new float[]{2f, 2f}, out, 1e-5f);
    }

    @Test
    void centerIsSkippedWhileEmbedderIsDown() {
        when(embedder.embedText(anyString())).thenReturn(null);
        service.loadCenter();
        assertArrayEquals(new float[]{3f, 2f}, service.centered(new float[]{3f, 2f}));
    }

    @Test
    void searchDoesNotWaitForTheCentre() {
        // before the centre is loaded the raw vector is used right away (loading happens in the background)
        when(embedder.embedText(anyString())).thenReturn(null);
        assertArrayEquals(new float[]{3f, 2f}, service.centered(new float[]{3f, 2f}));
    }

    @Test
    void productsMatchingTheAskedTypeAndGroupComeFirst() {
        // "váy đi tiệc cho phụ nữ": 5 is a women's dress, 9 a family set (adults), 3 men's socks, 4 a kids' dress
        doAnswer(inv -> {
            org.springframework.jdbc.core.RowCallbackHandler h = inv.getArgument(1);
            Object[][] rows = {{3L, "accessories", "men"}, {5L, "dress", "women"}, {4L, "dress", "kids"}, {9L, "dress", "family"}};
            for (Object[] r : rows) {
                java.sql.ResultSet rs = mock(java.sql.ResultSet.class);
                when(rs.getLong(1)).thenReturn((Long) r[0]);
                when(rs.getString(2)).thenReturn((String) r[1]);
                when(rs.getString(3)).thenReturn((String) r[2]);
                h.processRow(rs);
            }
            return null;
        }).when(jdbc).query(anyString(), any(org.springframework.jdbc.core.RowCallbackHandler.class), any(Object[].class));

        assertEquals(List.of(5L, 9L, 3L, 4L), service.boostIntent("váy đi tiệc cho phụ nữ", List.of(3L, 5L, 4L, 9L)));
    }

    @Test
    void queriesWithoutTypeOrGroupWordsKeepTheirOrder() {
        assertEquals(List.of(3L, 1L), service.boostIntent("đồ đi biển", List.of(3L, 1L)));
        // "tất cả" (all), "Việt Nam" (country) and "ba lỗ" (tank top) are not socks / men
        assertEquals(List.of(3L, 1L), service.boostIntent("tất cả đồ in cờ Việt Nam", List.of(3L, 1L)));
        verifyNoInteractions(jdbc);
    }

    @Test
    void intentWordsNeedWholeWords() {
        assertEquals(java.util.Set.of("accessories"), firstMatch(SemanticSearchService.TYPE_INTENTS, "tất thể thao"));
        assertNull(firstMatch(SemanticSearchService.TYPE_INTENTS, "tất cả sản phẩm"));
        assertEquals(java.util.Set.of("tshirt"), firstMatch(SemanticSearchService.TYPE_INTENTS, "áo ba lỗ"));
        assertNull(firstMatch(SemanticSearchService.GROUP_INTENTS, "áo ba lỗ"));
        assertNull(firstMatch(SemanticSearchService.GROUP_INTENTS, "áo cờ việt nam"));
        assertEquals(java.util.Set.of("men"), firstMatch(SemanticSearchService.GROUP_INTENTS, "quà cho ba"));
        assertEquals(java.util.Set.of("men"), firstMatch(SemanticSearchService.GROUP_INTENTS, "áo thun nam"));
    }

    @Test
    void decomposedVietnameseQueryStillMatches() {
        String nfd = java.text.Normalizer.normalize("váy", java.text.Normalizer.Form.NFD);
        doAnswer(inv -> {
            org.springframework.jdbc.core.RowCallbackHandler h = inv.getArgument(1);
            java.sql.ResultSet rs = mock(java.sql.ResultSet.class);
            when(rs.getLong(1)).thenReturn(2L);
            when(rs.getString(2)).thenReturn("dress");
            when(rs.getString(3)).thenReturn("women");
            h.processRow(rs);
            return null;
        }).when(jdbc).query(anyString(), any(org.springframework.jdbc.core.RowCallbackHandler.class), any(Object[].class));
        assertEquals(List.of(2L, 1L), service.boostIntent(nfd, List.of(1L, 2L)));
    }

    private static java.util.Set<String> firstMatch(List<java.util.Map.Entry<java.util.regex.Pattern, java.util.Set<String>>> intents, String q) {
        for (var e : intents) if (e.getKey().matcher(q).find()) return e.getValue();
        return null;
    }
}
