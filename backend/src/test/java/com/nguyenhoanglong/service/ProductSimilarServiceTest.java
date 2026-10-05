package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.ProductDto;
import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.repository.CategoryRepository;
import com.nguyenhoanglong.repository.ProductRepository;
import com.nguyenhoanglong.repository.ProductVariantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.PlatformTransactionManager;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * "San pham tuong tu": lay theo vector CLIP (product_embeddings), giu thu tu gan nhat truoc,
 * va bu bang luat cu (cung product_type, cung target_group) khi san pham chua co embedding hoac thieu ket qua.
 */
@ExtendWith(MockitoExtension.class)
class ProductSimilarServiceTest {

    @Mock private ProductRepository productRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private ProductVariantRepository variantRepository;
    @Mock private PlatformTransactionManager txManager;

    private ProductServiceImpl service;
    private Product target;

    @BeforeEach
    void setUp() {
        service = new ProductServiceImpl(productRepository, categoryRepository, variantRepository, txManager);
        target = product(1L, "polo", "men");
        when(productRepository.findBySlug("polo-1")).thenReturn(java.util.Optional.of(target));
    }

    @Test
    void returnsEmbeddingNeighboursNearestFirstWithoutFallback() {
        when(productRepository.findSimilarIdsByEmbedding(1L, "men", 3)).thenReturn(List.of(7L, 3L, 5L));
        // findAllById makes no ordering promise
        when(productRepository.findAllById(List.of(7L, 3L, 5L)))
                .thenReturn(List.of(product(3L, "polo", "men"), product(5L, "shirt", "men"), product(7L, "polo", "men")));

        List<ProductDto> result = service.getSimilarProducts("polo-1", 3);

        assertThat(result).extracting(ProductDto::getId).containsExactly(7L, 3L, 5L);
        // iterative scan must be enabled in the same transaction, before the vector query
        org.mockito.InOrder order = org.mockito.Mockito.inOrder(productRepository);
        order.verify(productRepository).enableHnswIterativeScan();
        order.verify(productRepository).findSimilarIdsByEmbedding(1L, "men", 3);
        verify(productRepository, never()).findSimilarActive(anyString(), any(), anyLong(), any(Pageable.class));
    }

    @Test
    void fallsBackToSameProductTypeWhenProductHasNoEmbedding() {
        when(productRepository.findSimilarIdsByEmbedding(1L, "men", 2)).thenReturn(List.of());
        when(productRepository.findAllById(List.of())).thenReturn(List.of());
        when(productRepository.findSimilarActive(eq("polo"), eq("men"), eq(1L), any(Pageable.class)))
                .thenReturn(List.of(product(8L, "polo", "men"), product(9L, "polo", "men"), product(10L, "polo", "men")));

        assertThat(service.getSimilarProducts("polo-1", 2)).extracting(ProductDto::getId).containsExactly(8L, 9L);
    }

    @Test
    void topsUpPartialResultsWithoutDuplicates() {
        when(productRepository.findSimilarIdsByEmbedding(1L, "men", 3)).thenReturn(List.of(4L));
        when(productRepository.findAllById(List.of(4L))).thenReturn(List.of(product(4L, "polo", "men")));
        when(productRepository.findSimilarActive(eq("polo"), eq("men"), eq(1L), any(Pageable.class)))
                .thenReturn(List.of(product(4L, "polo", "men"), product(6L, "polo", "men"), product(2L, "polo", "men")));

        assertThat(service.getSimilarProducts("polo-1", 3)).extracting(ProductDto::getId).containsExactly(4L, 6L, 2L);
    }

    @Test
    void noFallbackWhenProductTypeMissing() {
        target.setProductType(null);
        when(productRepository.findSimilarIdsByEmbedding(anyLong(), any(), anyInt())).thenReturn(List.of());
        when(productRepository.findAllById(List.of())).thenReturn(List.of());

        assertThat(service.getSimilarProducts("polo-1", 10)).isEmpty();
        verify(productRepository, never()).findSimilarActive(any(), any(), anyLong(), any(Pageable.class));
    }

    private static Product product(Long id, String productType, String targetGroup) {
        Product p = new Product();
        p.setId(id);
        p.setName("p" + id);
        p.setSlug("p-" + id);
        p.setPrice(BigDecimal.TEN);
        p.setProductType(productType);
        p.setTargetGroup(targetGroup);
        p.setStatus("ACTIVE");
        return p;
    }
}
