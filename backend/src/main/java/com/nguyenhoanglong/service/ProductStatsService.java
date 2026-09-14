package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.ProductStatsDto;
import com.nguyenhoanglong.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Provides aggregated stats about ACTIVE products for the catalog sidebar.
 *
 * IMPORTANT: This returns REAL counts from the DB — the previous hardcoded
 * constants in the products page UI caused the "Nam (150)" mismatch with the
 * actual DB count (177). See runtime verification:
 *   targetGroup=men -> 177 in API vs hardcoded 150 in UI.
 */
@Service
public class ProductStatsService {

    /** Public targetGroup ids used by the sidebar filter (UI id -> DB column). */
    private static final java.util.Set<String> KNOWN_TARGET_GROUPS =
            java.util.Set.of("men", "women", "kids", "boys", "girls", "family", "baby");

    private final ProductRepository productRepository;

    public ProductStatsService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public ProductStatsDto getStats() {
        ProductStatsDto dto = new ProductStatsDto();
        dto.setTotalActive(productRepository.countActive());

        // targetGroup: include every known key (even if 0) plus everything we observe in DB.
        // For "kids", we split into "boys" and "girls" sub-counts so the sidebar shows real numbers.
        Map<String, Long> tg = new LinkedHashMap<>();
        for (String k : KNOWN_TARGET_GROUPS) tg.put(k, 0L);
        for (Object[] row : productRepository.countActiveByTargetGroup()) {
            String key = (String) row[0];
            Long count = ((Number) row[1]).longValue();
            if (key == null || key.isBlank()) continue;
            tg.put(key, count);
        }

        // Sub-split kids into boys/girls using the dedicated query.
        // The sidebar uses the keys "boys" and "girls" (as targetGroup param values),
        // not separate stats fields, so we replace "kids" with individual boy/girl counts.
        Long boysCount = 0L;
        Long girlsCount = 0L;
        for (Object[] row : productRepository.countActiveKidsByGender()) {
            String g = (String) row[0];
            Long c = ((Number) row[1]).longValue();
            if (g == null) continue;
            String lg = g.toLowerCase();
            if (lg.equals("boy") || lg.equals("boys")) boysCount += c;
            else if (lg.equals("girl") || lg.equals("girls")) girlsCount += c;
        }
        // Remove the aggregate "kids" key from the returned map and add separate keys.
        // (Keep "kids" at 0 so the filter sidebar can still show it.)
        tg.remove("kids");
        tg.put("boys", boysCount);
        tg.put("girls", girlsCount);
        tg.put("kids", boysCount + girlsCount); // total kids

        dto.setTargetGroup(tg);

        // productType: only present types with count > 0 (to keep sidebar lean)
        Map<String, Long> pt = new LinkedHashMap<>();
        for (Object[] row : productRepository.countActiveByProductType()) {
            String key = (String) row[0];
            Long count = ((Number) row[1]).longValue();
            if (key == null || key.isBlank() || count == null || count <= 0) continue;
            pt.put(key, count);
        }
        // Add a virtual "family-set" bucket = total of family products so the
        // sidebar's Family Set option shows real counts even when no products
        // carry productType="family-set".
        Long familyCount = tg.get("family");
        if (familyCount != null && familyCount > 0) {
            pt.put("family-set", familyCount);
        }
        dto.setProductType(pt);

        // category
        Map<String, Long> cat = new LinkedHashMap<>();
        for (Object[] row : productRepository.countActiveByCategory()) {
            String key = (String) row[0];
            Long count = ((Number) row[1]).longValue();
            if (key == null || key.isBlank() || count == null || count <= 0) continue;
            cat.put(key, count);
        }
        dto.setCategory(cat);

        return dto;
    }
}
