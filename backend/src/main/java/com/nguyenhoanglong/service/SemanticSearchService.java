package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.ProductDto;
import com.nguyenhoanglong.recsys.EmbedderClient;
import com.nguyenhoanglong.repository.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;

/**
 * Sprint 5 search (scripts/search/eval_search.py measures the same pipeline):
 *
 *   text  : keyword matches (every word in name / description / slug / type, best sellers first)
 *           + nearest products by the fused image+text vector (product_embeddings), merged with
 *           Reciprocal Rank Fusion (keyword list weighted x2). Embedder down -> keyword ranking alone.
 *           The query vector is CENTERED first (minus the mean vector of generic shopping phrases):
 *           raw CLIP text vectors sit close to a few "hub" products, so every query - "váy đi tiệc",
 *           "giày", "đồ đi biển" - got the same socks / plain shirts on top. Last, products whose type
 *           and customer group match words in the query ("váy", "áo khoác", "nữ", "bé"...) move ahead
 *           of the rest, keeping order inside each part. Measured in scripts/search/results.md.
 *           A third list from text-only vectors (product_text_embeddings) was measured and LOWERED
 *           P@10 (0.350 -> 0.270, scripts/search/results.md), so it is not used.
 *   image : nearest products by the fused vector (it is 70 % image) to the uploaded photo.
 */
@Service
public class SemanticSearchService {

    public enum Strategy { HYBRID, KEYWORD, IMAGE }

    public record SearchResult(Strategy strategy, List<ProductDto> products) {}

    static final int RRF_K = 60;
    static final int POOL = 50;
    static final double KEYWORD_WEIGHT = 2.0;

    /** Generic phrases whose mean vector is the "every query" direction removed before the vector search. */
    static final List<String> CENTER_PHRASES = List.of(
            "áo", "quần", "thời trang", "quần áo", "đồ mặc hằng ngày", "sản phẩm mới", "trang phục", "đồ đẹp",
            "mặc đi chơi", "đồ đi làm", "phụ kiện", "đồ trẻ em", "đồ nam", "đồ nữ", "màu đen", "màu trắng", "cotton",
            "giá rẻ", "mùa hè", "mùa đông", "áo thun", "áo sơ mi", "quần dài", "váy", "áo khoác", "đồ thể thao",
            "đồ ngủ", "tất", "mũ", "túi");

    /** Query words -> product_type values. First match wins, so "chân váy" is checked before "váy". */
    static final List<Map.Entry<Pattern, Set<String>>> TYPE_INTENTS = List.of(
            Map.entry(Pattern.compile("chân váy"), Set.of("skirt")),
            Map.entry(Pattern.compile("(?<!chân )(váy|đầm)"), Set.of("dress", "skirt")),
            Map.entry(Pattern.compile("áo khoác|áo gió|chống nắng|cardigan|áo nỉ|hoodie|blazer"), Set.of("outerwear")),
            Map.entry(Pattern.compile("sơ mi"), Set.of("shirt")),
            Map.entry(Pattern.compile("polo"), Set.of("polo")),
            Map.entry(Pattern.compile("áo thun|áo phông|ba lỗ|tank ?top|áo tập"), Set.of("tshirt")),
            Map.entry(Pattern.compile("quần (short|đùi|soóc|sooc|sọt)"), Set.of("shorts")),
            Map.entry(Pattern.compile("quần (tây|jean|dài|jogger|âu|kaki|bò|ống)|quần chạy"), Set.of("pants")),
            Map.entry(Pattern.compile("đồ ngủ|mặc (ở )?nhà|đồ bộ|pijama|pyjama|đồ lót|quần lót"), Set.of("homewear")),
            // "tất cả" means "all", not socks
            Map.entry(Pattern.compile("(?U)\\b(tất(?! cả)|vớ|mũ|nón|túi|khăn|giày|dép|guốc|sandal|thắt lưng|phụ kiện)\\b"), Set.of("accessories")));

    /** Query words -> target_group values ((?U): word boundaries that understand Vietnamese letters). */
    static final List<Map.Entry<Pattern, Set<String>>> GROUP_INTENTS = List.of(
            Map.entry(Pattern.compile("cả nhà|gia đình|đồ đôi|áo đôi"), Set.of("family")),
            Map.entry(Pattern.compile("(?U)\\bbé|trẻ em|em bé|cho con|học sinh|đi học"), Set.of("kids")),
            Map.entry(Pattern.compile("(?U)\\b(nữ|phụ nữ|vợ|mẹ|con gái|chị em)\\b"), Set.of("women")),
            // not "Việt Nam" (the country) or "ba lỗ" (tank top)
            Map.entry(Pattern.compile("(?U)\\b((?<!việt )nam|chồng|bố|ba(?! lỗ)|đàn ông|con trai)\\b"), Set.of("men")));

    private volatile float[] center;
    private final AtomicBoolean centerLoading = new AtomicBoolean();

    private final EmbedderClient embedder;
    private final JdbcTemplate jdbc;
    private final ProductRepository productRepository;
    private final ProductService productService;

    public SemanticSearchService(EmbedderClient embedder, JdbcTemplate jdbc, ProductRepository productRepository,
                                 ProductService productService) {
        this.embedder = embedder;
        this.jdbc = jdbc;
        this.productRepository = productRepository;
        this.productService = productService;
    }

    @Transactional(readOnly = true)
    public SearchResult search(String query, int limit) {
        String q = query == null ? "" : query.trim();
        if (q.isEmpty()) return new SearchResult(Strategy.KEYWORD, List.of());
        if (q.length() > 200) q = q.substring(0, 200);

        List<Long> keyword = keywordIds(q, POOL);
        float[] vector = embedder.embedText(q);
        if (vector == null) {
            return new SearchResult(Strategy.KEYWORD,
                    productService.getActiveProductsInOrder(cap(boostIntent(q, keyword), limit)));
        }
        List<Long> semantic = nearestByInnerProduct(EmbedderClient.toVectorLiteral(centered(vector)), POOL);
        List<Long> fused = rrf(List.of(keyword, semantic), List.of(KEYWORD_WEIGHT, 1.0));
        return new SearchResult(Strategy.HYBRID,
                productService.getActiveProductsInOrder(cap(boostIntent(q, fused), limit)));
    }

    @Transactional(readOnly = true)
    public SearchResult searchByImage(byte[] image, String filename, String contentType, int limit) {
        float[] vector = embedder.embedImage(image, filename, contentType);
        if (vector == null) {
            throw new ResponseStatusException(embedder.isCoolingDown() ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.BAD_REQUEST,
                    embedder.isCoolingDown() ? "Tìm kiếm bằng ảnh tạm thời không khả dụng" : "Không đọc được ảnh");
        }
        productRepository.enableHnswIterativeScan();
        List<Long> ids = nearest("product_embeddings", EmbedderClient.toVectorLiteral(vector), limit);
        return new SearchResult(Strategy.IMAGE, productService.getActiveProductsInOrder(ids));
    }

    /** Same predicate as ProductSpecification's word match: every word somewhere in the product's text fields. */
    List<Long> keywordIds(String q, int limit) {
        String[] words = q.toLowerCase().split("\\s+");
        StringBuilder sql = new StringBuilder("SELECT id FROM products WHERE status = 'ACTIVE'");
        List<Object> args = new ArrayList<>();
        for (String w : words) {
            if (w.isEmpty()) continue;
            sql.append(" AND (LOWER(name) LIKE ? OR LOWER(COALESCE(description, '')) LIKE ? OR LOWER(slug) LIKE ?"
                    + " OR LOWER(COALESCE(product_type, '')) LIKE ?)");
            String like = "%" + w.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
            for (int i = 0; i < 4; i++) args.add(like);
        }
        sql.append(" ORDER BY sold_count DESC NULLS LAST, id LIMIT ?");
        args.add(limit);
        return jdbc.queryForList(sql.toString(), Long.class, args.toArray());
    }

    /** query - mean(CENTER_PHRASES); the raw vector while the centre is not computed yet. */
    float[] centered(float[] q) {
        float[] c = center;
        if (c == null) {
            // The centre costs 30 embedder calls. It used to be computed inside the first search
            // while holding a lock, so every concurrent search waited; now it loads in the
            // background and searches use the raw vector until it is ready.
            loadCenterAsync();
            return q;
        }
        if (c.length != q.length) return q;
        float[] out = new float[q.length];
        for (int i = 0; i < q.length; i++) out[i] = q[i] - c[i];
        return out;
    }

    /** Warm the centre at startup; also re-triggered by searches until it succeeds. */
    @EventListener(ApplicationReadyEvent.class)
    public void loadCenterAsync() {
        if (center == null && !centerLoading.get()) CompletableFuture.runAsync(this::loadCenter);
    }

    /** Embeds CENTER_PHRASES once; leaves the centre unset (retried later) if the embedder fails. */
    void loadCenter() {
        if (center != null || !centerLoading.compareAndSet(false, true)) return;
        try {
            float[] sum = null;
            for (String phrase : CENTER_PHRASES) {
                float[] v = embedder.embedText(phrase);
                if (v == null) return;
                if (sum == null) sum = new float[v.length];
                for (int i = 0; i < v.length; i++) sum[i] += v[i] / CENTER_PHRASES.size();
            }
            center = sum;
        } finally {
            centerLoading.set(false);
        }
    }

    /**
     * Highest inner product with the centered (so no longer unit-length) query. Exact scan: the HNSW
     * index is built for cosine distance, and the catalogue is a few thousand rows.
     */
    private List<Long> nearestByInnerProduct(String vectorLiteral, int limit) {
        return jdbc.queryForList("""
                SELECT p.id FROM product_embeddings e JOIN products p ON p.id = e.product_id
                WHERE p.status = 'ACTIVE'
                ORDER BY e.embedding <#> CAST(? AS vector)
                LIMIT ?
                """, Long.class, vectorLiteral, limit);
    }

    /** Products matching the type / customer group named in the query first; order kept inside each part. */
    List<Long> boostIntent(String q, List<Long> ids) {
        if (ids.isEmpty()) return ids;
        // Patterns are NFC; some keyboards send decomposed Vietnamese (NFD), which never matched.
        String ql = Normalizer.normalize(q, Normalizer.Form.NFC).toLowerCase();
        Set<String> types = firstMatch(TYPE_INTENTS, ql);
        Set<String> groups = firstMatch(GROUP_INTENTS, ql);
        if (types == null && groups == null) return ids;
        Map<Long, String[]> meta = new HashMap<>();
        String in = String.join(",", Collections.nCopies(ids.size(), "?"));
        jdbc.query("SELECT id, product_type, target_group FROM products WHERE id IN (" + in + ")",
                (org.springframework.jdbc.core.RowCallbackHandler) rs ->
                        meta.put(rs.getLong(1), new String[]{rs.getString(2), rs.getString(3)}),
                ids.toArray());
        List<Long> match = new ArrayList<>();
        List<Long> rest = new ArrayList<>();
        for (Long id : ids) {
            String[] m = meta.get(id);
            boolean ok = m != null
                    && (types == null || types.contains(m[0]))
                    // family sets suit adults asking for "nam" / "nữ", not a "bé" query
                    && (groups == null || groups.contains(m[1]) || ("family".equals(m[1]) && !groups.contains("kids")));
            (ok ? match : rest).add(id);
        }
        match.addAll(rest);
        return match;
    }

    private static Set<String> firstMatch(List<Map.Entry<Pattern, Set<String>>> intents, String q) {
        for (var e : intents) if (e.getKey().matcher(q).find()) return e.getValue();
        return null;
    }

    private List<Long> nearest(String table, String vectorLiteral, int limit) {
        // table is a constant from this class, never user input
        return jdbc.queryForList("""
                WITH nn AS MATERIALIZED (
                    SELECT p.id, e.embedding <=> CAST(? AS vector) AS distance
                    FROM %s e JOIN products p ON p.id = e.product_id
                    WHERE p.status = 'ACTIVE'
                    ORDER BY e.embedding <=> CAST(? AS vector)
                    LIMIT ?
                )
                SELECT id FROM nn ORDER BY distance
                """.formatted(table), Long.class, vectorLiteral, vectorLiteral, limit);
    }

    /** Reciprocal Rank Fusion (Cormack et al. 2009): score = sum 1 / (k + rank). */
    static List<Long> rrf(List<List<Long>> rankings) {
        return rrf(rankings, Collections.nCopies(rankings.size(), 1.0));
    }

    /** Weighted RRF: score = sum weight / (k + rank). */
    static List<Long> rrf(List<List<Long>> rankings, List<Double> weights) {
        Map<Long, Double> score = new LinkedHashMap<>();
        for (int l = 0; l < rankings.size(); l++) {
            List<Long> ranking = rankings.get(l);
            double w = weights.get(l);
            for (int r = 0; r < ranking.size(); r++) {
                score.merge(ranking.get(r), w / (RRF_K + r + 1), Double::sum);
            }
        }
        List<Long> ids = new ArrayList<>(score.keySet());
        ids.sort(Comparator.comparingDouble((Long id) -> score.get(id)).reversed());
        return ids;
    }

    private static List<Long> cap(List<Long> ids, int n) {
        return ids.size() > n ? ids.subList(0, n) : ids;
    }
}
