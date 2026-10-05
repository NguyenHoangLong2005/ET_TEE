package com.nguyenhoanglong.config;

import com.nguyenhoanglong.service.ProductService;
import com.nguyenhoanglong.service.ProductStatsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Pre-loads the product listings behind the storefront header tabs so the first
 * click on each tab is served from cache instead of paying the remote-DB cost.
 * Must mirror the header links and the /products page defaults (page 1, 24 items,
 * default sort) so the cache keys match.
 */
@Component
public class CatalogCacheWarmup {

    private static final Logger log = LoggerFactory.getLogger(CatalogCacheWarmup.class);

    private final ProductService productService;
    private final ProductStatsService statsService;

    public CatalogCacheWarmup(ProductService productService, ProductStatsService statsService) {
        this.productService = productService;
        this.statsService = statsService;
    }

    @Async
    @EventListener(ApplicationReadyEvent.class)
    public void warmUp() {
        long start = System.currentTimeMillis();
        try {
            statsService.getStats();
            var page = PageRequest.of(0, 24, Sort.by(Sort.Direction.DESC, "id"));
            // args: q, targetGroup, gender, productType, category, collection, color,
            //       adultSize, kidsSize, accessorySize, minPrice, maxPrice, status
            productService.getProducts(null, "men", null, null, null, null, null, null, null, null, null, null, null, page);
            productService.getProducts(null, "women", null, null, null, null, null, null, null, null, null, null, null, page);
            productService.getProducts(null, "boys", null, null, null, null, null, null, null, null, null, null, null, page);
            productService.getProducts(null, "girls", null, null, null, null, null, null, null, null, null, null, null, page);
            productService.getProducts(null, null, null, null, "accessories", null, null, null, null, null, null, null, null, page);
            productService.getProducts(null, "family", null, null, null, null, null, null, null, null, null, null, null, page);
            productService.getProducts(null, null, null, null, null, null, null, null, null, null, null, null, "sale", page);
            // Unfiltered listing ("Xóa bộ lọc" / "Xem tất cả") and the status filters
            productService.getProducts(null, null, null, null, null, null, null, null, null, null, null, null, null, page);
            productService.getProducts(null, null, null, null, null, null, null, null, null, null, null, null, "new", page);
            productService.getProducts(null, null, null, null, null, null, null, null, null, null, null, null, "best", page);
            log.info("Catalog cache warm-up finished in {} ms", System.currentTimeMillis() - start);
        } catch (Exception e) {
            log.warn("Catalog cache warm-up failed (cache will fill on demand): {}", e.getMessage());
        }
    }
}
