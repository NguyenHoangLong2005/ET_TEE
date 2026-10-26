package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.ProductDto;
import com.nguyenhoanglong.repository.UserBehaviorEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Home page sections next to "Danh rieng cho ban" (ForYouService):
 *
 *   trending          everyone (also brand-new visitors): most interest in the last 7 days from
 *                     user_behavior_events, counted in distinct shoppers so one busy session
 *                     cannot push an item up. Widens to 30 days when the week is too quiet.
 *   becauseYouViewed  CLIP nearest neighbours (ProductService.getSimilarProducts) of the product
 *                     this shopper looked at last, the item named in the section title.
 *   recentlyViewed    the shopper's own last product pages, newest first (no model).
 */
@Service
public class HomeRecommendationService {

    public record Trending(int windowDays, List<ProductDto> products) {}

    public record BecauseYouViewed(ProductDto anchor, List<ProductDto> products) {}

    /** Distinct shoppers who viewed / added to cart / bought, weighted 1 / 3 / 5. */
    static final String TRENDING_SQL = """
            SELECT e.product_id
            FROM user_behavior_events e
            JOIN products p ON p.id = e.product_id AND p.status = 'ACTIVE'
            WHERE e.created_at >= ?
            GROUP BY e.product_id
            ORDER BY COUNT(DISTINCT CASE WHEN e.event_type = 'VIEW' THEN e.user_id END)
                   + 3 * COUNT(DISTINCT CASE WHEN e.event_type = 'ADD_TO_CART' THEN e.user_id END)
                   + 5 * COUNT(DISTINCT CASE WHEN e.event_type = 'PURCHASE' THEN e.user_id END) DESC,
                     e.product_id
            LIMIT ?
            """;
    static final int[] TRENDING_WINDOWS = {7, 30};
    /** Same answer for everyone: recomputed at most this often. */
    static final long TRENDING_TTL_MS = 10 * 60 * 1000;
    static final int RECENT_WINDOW = 50;

    private static final Logger log = LoggerFactory.getLogger(HomeRecommendationService.class);

    private final JdbcTemplate jdbc;
    private final UserBehaviorEventRepository eventRepository;
    private final ProductService productService;

    private record CachedTrending(long at, int limit, Trending value) {}
    private volatile CachedTrending trendingCache;

    public HomeRecommendationService(JdbcTemplate jdbc, UserBehaviorEventRepository eventRepository,
                                     ProductService productService) {
        this.jdbc = jdbc;
        this.eventRepository = eventRepository;
        this.productService = productService;
    }

    @Transactional(readOnly = true)
    public Trending trending(int limit) {
        CachedTrending cached = trendingCache;
        long now = System.currentTimeMillis();
        if (cached != null && cached.limit() >= limit && now - cached.at() < TRENDING_TTL_MS) {
            Trending t = cached.value();
            return new Trending(t.windowDays(), cap(t.products(), limit));
        }
        Trending result = new Trending(0, List.of());
        for (int days : TRENDING_WINDOWS) {
            Timestamp since = Timestamp.valueOf(LocalDateTime.now().minusDays(days));
            List<Long> ids = jdbc.queryForList(TRENDING_SQL, Long.class, since, limit);
            result = new Trending(days, productService.getActiveProductsInOrder(ids));
            if (result.products().size() >= limit) break;
        }
        trendingCache = new CachedTrending(now, limit, result);
        return result;
    }

    @Transactional(readOnly = true)
    public BecauseYouViewed becauseYouViewed(String userKey, int limit) {
        if (userKey == null) return new BecauseYouViewed(null, List.of());
        List<Long> recent = recentViews(userKey);
        // the newest viewed product that is still on sale
        for (Long anchorId : recent) {
            List<ProductDto> anchor = productService.getActiveProductsInOrder(List.of(anchorId));
            if (anchor.isEmpty()) continue;
            Set<Long> seen = new HashSet<>(recent);
            List<ProductDto> similar;
            try {
                similar = productService.getSimilarProducts(anchor.get(0).getSlug(), limit + Math.min(seen.size(), 12));
            } catch (RuntimeException e) {
                log.warn("Similar products for the home page failed", e);
                return new BecauseYouViewed(null, List.of());
            }
            // already looked at: not news
            List<ProductDto> fresh = similar.stream().filter(p -> !seen.contains(p.getId())).toList();
            return new BecauseYouViewed(anchor.get(0), cap(fresh, limit));
        }
        return new BecauseYouViewed(null, List.of());
    }

    @Transactional(readOnly = true)
    public List<ProductDto> recentlyViewed(String userKey, int limit) {
        if (userKey == null) return List.of();
        return cap(productService.getActiveProductsInOrder(recentViews(userKey)), limit);
    }

    /** Distinct product ids this shopper viewed, newest first. */
    private List<Long> recentViews(String userKey) {
        List<Long> ids = eventRepository.findRecentProductIds(
                userKey, List.of(BehaviorEventService.VIEW), PageRequest.of(0, RECENT_WINDOW));
        return new ArrayList<>(new LinkedHashSet<>(ids));
    }

    private static <T> List<T> cap(List<T> list, int n) {
        return list.size() > n ? list.subList(0, n) : list;
    }
}
