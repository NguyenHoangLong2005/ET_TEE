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
}
