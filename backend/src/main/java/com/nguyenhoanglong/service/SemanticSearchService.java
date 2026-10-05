package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.ProductDto;
import com.nguyenhoanglong.recsys.EmbedderClient;
import com.nguyenhoanglong.repository.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

/**
 * Sprint 5 search (scripts/search/eval_search.py measures the same pipeline):
 *
 *   text  : keyword matches (every word in name / description / slug / type, best sellers first)
 *           + nearest products by the fused image+text vector (product_embeddings)
 *           merged with Reciprocal Rank Fusion. Embedder down -> keyword ranking alone.
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
            return new SearchResult(Strategy.KEYWORD, productService.getActiveProductsInOrder(cap(keyword, limit)));
        }
        productRepository.enableHnswIterativeScan();
        String literal = EmbedderClient.toVectorLiteral(vector);
        List<Long> fused = rrf(List.of(keyword, nearest("product_embeddings", literal, POOL)));
        return new SearchResult(Strategy.HYBRID, productService.getActiveProductsInOrder(cap(fused, limit)));
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
        Map<Long, Double> score = new LinkedHashMap<>();
        for (List<Long> ranking : rankings) {
            for (int r = 0; r < ranking.size(); r++) {
                score.merge(ranking.get(r), 1.0 / (RRF_K + r + 1), Double::sum);
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
