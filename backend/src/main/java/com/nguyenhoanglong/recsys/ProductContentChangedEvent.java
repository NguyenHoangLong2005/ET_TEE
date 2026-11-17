package com.nguyenhoanglong.recsys;

/**
 * Published after a product's name, description, images or other searchable fields may have changed,
 * so {@link ProductEmbeddingService} can refresh its CLIP vector once the transaction commits.
 */
public record ProductContentChangedEvent(Long productId) {
}
