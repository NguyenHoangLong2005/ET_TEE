package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.ProductDto;
import com.nguyenhoanglong.entity.Cart;
import com.nguyenhoanglong.entity.CartItem;
import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.repository.CartRepository;
import com.nguyenhoanglong.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Array;
import java.util.*;

/**
 * Cart page / add-to-cart drawer "Thuong duoc mua kem" (Sprint 3).
 *
 * Rules are mined offline by scripts/fpgrowth/mine_rules.py (FP-Growth over order baskets) at the
 * level of product SEGMENTS (target_group:product_type, e.g. men:pants -> men:tshirt) and stored
 * in association_rules. Same algorithm as Recommender in that script:
 *   1. segments: rules whose antecedent is contained in the cart's segments, ranked by
 *      confidence x lift, skipping segments already in the cart; empty slots back off to the
 *      best-selling segments of the cart's own customer group
 *   2. products: per segment the best sellers that are not dearer than the dearest cart item
 *      ("gia vua phai" add-ons), interleaved across segments
 */
@Service
public class CartComplementService {

    public enum Source { RULE, POPULAR_SEGMENT }

    public record Complement(ProductDto product, String segment, Source source) {}

    public record CartComplements(String model, List<Complement> items) {}

    static final int MAX_SEGMENTS = 3;
    private static final long CACHE_MS = 10 * 60 * 1000L;
    private static final Set<String> GROUPS = Set.of("men", "women", "kids");

    record Rule(Set<String> antecedent, String consequent, double score) {}

    private static final Logger log = LoggerFactory.getLogger(CartComplementService.class);

    private final JdbcTemplate jdbc;
    private final CartRepository cartRepository;
    private final UserRepository userRepository;
    private final ProductService productService;

    private volatile List<Rule> rules = List.of();
    private volatile List<String> popularSegments = List.of();
    private volatile String modelVersion;
    private volatile long loadedAt;

    public CartComplementService(JdbcTemplate jdbc, CartRepository cartRepository, UserRepository userRepository,
                                 ProductService productService) {
        this.jdbc = jdbc;
        this.cartRepository = cartRepository;
        this.userRepository = userRepository;
        this.productService = productService;
    }

    /** Same mapping as segment() in mine_rules.py: unknown / accessories / family groups are 'unisex'. */
    public static String segmentOf(String targetGroup, String productType) {
        String g = targetGroup == null ? "" : targetGroup.toLowerCase();
        return (GROUPS.contains(g) ? g : "unisex") + ":" + (productType == null ? "other" : productType.toLowerCase());
    }

    @Transactional(readOnly = true)
    public CartComplements forCart(String userEmail, String guestToken, int limit) {
        Optional<Cart> cart = Optional.empty();
        if (userEmail != null) {
            cart = userRepository.findByEmail(userEmail).flatMap(u -> cartRepository.findByUserId(u.getId()));
        } else if (guestToken != null && !guestToken.isBlank()) {
            cart = cartRepository.findByGuestToken(guestToken);
        }
        List<Product> products = new ArrayList<>();
        cart.ifPresent(c -> {
            for (CartItem item : c.getItems()) {
                if (item.getProductVariant() != null && item.getProductVariant().getProduct() != null) {
                    products.add(item.getProductVariant().getProduct());
                }
            }
        });
        return forProducts(products, limit);
    }

    CartComplements forProducts(List<Product> cartProducts, int limit) {
        if (cartProducts.isEmpty()) return new CartComplements(modelVersion, List.of());
        ensureLoaded();

        Set<String> cartSegments = new LinkedHashSet<>();
        Set<Long> cartIds = new HashSet<>();
        BigDecimal ceiling = BigDecimal.ZERO;
        for (Product p : cartProducts) {
            cartSegments.add(segmentOf(p.getTargetGroup(), p.getProductType()));
            cartIds.add(p.getId());
            BigDecimal price = effectivePrice(p);
            if (price != null && price.compareTo(ceiling) > 0) ceiling = price;
        }

        Map<String, Source> segments = chooseSegments(cartSegments);
        List<List<Long>> perSegment = new ArrayList<>();
        List<String> segmentOrder = new ArrayList<>(segments.keySet());
        for (String segment : segmentOrder) {
            perSegment.add(bestSellers(segment, ceiling, cartIds, limit));
        }
        // interleave so the drawer shows one item of each suggested segment first
        List<Long> ids = new ArrayList<>();
        Map<Long, String> segmentOfId = new HashMap<>();
        for (int pos = 0; ids.size() < limit; pos++) {
            boolean any = false;
            for (int s = 0; s < perSegment.size() && ids.size() < limit; s++) {
                if (pos < perSegment.get(s).size()) {
                    Long id = perSegment.get(s).get(pos);
                    ids.add(id);
                    segmentOfId.put(id, segmentOrder.get(s));
                    any = true;
                }
            }
            if (!any) break;
        }
        List<Complement> items = productService.getActiveProductsInOrder(ids).stream()
                .map(dto -> {
                    String seg = segmentOfId.get(dto.getId());
                    return new Complement(dto, seg, segments.get(seg));
                })
                .toList();
        return new CartComplements(modelVersion, items);
    }

    LinkedHashMap<String, Source> chooseSegments(Set<String> cartSegments) {
        Map<String, Double> best = new HashMap<>();
        for (Rule r : rules) {
            if (cartSegments.contains(r.consequent()) || !cartSegments.containsAll(r.antecedent())) continue;
            best.merge(r.consequent(), r.score(), Math::max);
        }
        LinkedHashMap<String, Source> out = new LinkedHashMap<>();
        best.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(MAX_SEGMENTS)
                .forEach(e -> out.put(e.getKey(), Source.RULE));
        Set<String> groups = new HashSet<>(Set.of("unisex"));
        cartSegments.forEach(s -> groups.add(s.substring(0, s.indexOf(':'))));
        for (String s : popularSegments) {
            if (out.size() >= MAX_SEGMENTS) break;
            if (!cartSegments.contains(s) && !out.containsKey(s) && groups.contains(s.substring(0, s.indexOf(':')))) {
                out.put(s, Source.POPULAR_SEGMENT);
            }
        }
        return out;
    }

    private List<Long> bestSellers(String segment, BigDecimal ceiling, Set<Long> exclude, int limit) {
        String group = segment.substring(0, segment.indexOf(':'));
        String type = segment.substring(segment.indexOf(':') + 1);
        List<Long> ids = jdbc.queryForList("""
                SELECT id FROM products
                WHERE status = 'ACTIVE' AND LOWER(product_type) = ?
                  AND (CASE WHEN LOWER(target_group) IN ('men', 'women', 'kids') THEN LOWER(target_group)
                            ELSE 'unisex' END) = ?
                  AND COALESCE(NULLIF(sale_price, 0), price) <= ?
                ORDER BY sold_count DESC NULLS LAST, id
                LIMIT ?
                """, Long.class, type, group, ceiling, limit + exclude.size());
        return ids.stream().filter(id -> !exclude.contains(id)).limit(limit).toList();
    }

    private static BigDecimal effectivePrice(Product p) {
        BigDecimal sale = p.getSalePrice();
        if (sale != null && sale.signum() > 0) return sale;
        return p.getPrice();
    }

    void install(List<Rule> rules, List<String> popularSegments, String modelVersion) {
        this.rules = List.copyOf(rules);
        this.popularSegments = List.copyOf(popularSegments);
        this.modelVersion = modelVersion;
        this.loadedAt = System.currentTimeMillis();
    }

    private void ensureLoaded() {
        if (System.currentTimeMillis() - loadedAt < CACHE_MS) return;
        synchronized (this) {
            if (System.currentTimeMillis() - loadedAt < CACHE_MS) return;
            try {
                String[] version = {null};
                List<Rule> loaded = jdbc.query(
                        "SELECT antecedent, consequent, confidence * lift AS score, model_version FROM association_rules",
                        (rs, i) -> {
                            Array arr = rs.getArray("antecedent");
                            version[0] = rs.getString("model_version");
                            return new Rule(new HashSet<>(Arrays.asList((String[]) arr.getArray())),
                                    rs.getString("consequent"), rs.getDouble("score"));
                        });
                List<String> popular = jdbc.queryForList("""
                        SELECT (CASE WHEN LOWER(target_group) IN ('men', 'women', 'kids') THEN LOWER(target_group)
                                     ELSE 'unisex' END) || ':' || COALESCE(LOWER(product_type), 'other') AS seg
                        FROM products WHERE status = 'ACTIVE'
                        GROUP BY 1 ORDER BY SUM(COALESCE(sold_count, 0)) DESC
                        """, String.class);
                install(loaded, popular, version[0]);
                log.info("Cart complements: {} association rules ({})", loaded.size(), modelVersion);
            } catch (RuntimeException e) {
                // table missing (H2 tests) or DB hiccup: back-off segments only
                log.warn("Could not load association rules: {}", e.getMessage());
            } finally {
                loadedAt = System.currentTimeMillis();
            }
        }
    }
}
