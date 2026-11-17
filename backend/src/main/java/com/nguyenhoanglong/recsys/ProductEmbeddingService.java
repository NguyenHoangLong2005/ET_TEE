package com.nguyenhoanglong.recsys;

import com.nguyenhoanglong.config.UploadConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionalEventListener;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Keeps product_embeddings up to date without the offline notebook
 * (scripts/embeddings/colab_product_embeddings.py, which stays the way to rebuild everything).
 *
 * <ul>
 *   <li>A product created or edited through the app is embedded right after its transaction commits.</li>
 *   <li>Every few minutes, active products that still have no vector (bulk SQL, an embedder outage...)
 *       are filled in.</li>
 * </ul>
 *
 * The vector is built exactly like the notebook: same text (port of {@code build_text}), same first image,
 * same models through services/embedder, fused 0.7 image + 0.3 text and L2-normalised; a product without a
 * usable image gets the text vector ({@code source = 'text'}). input_hash uses the notebook formula, so a
 * later notebook run skips products already embedded here (a text over the embedder limit would be cut and
 * gets a distinct hash instead, so the notebook recomputes it).
 */
@Service
public class ProductEmbeddingService {

    /** Must equal MODEL_VERSION in the notebook (it is part of input_hash). */
    static final String MODEL_VERSION = "img=sentence-transformers/clip-ViT-B-32@327ab6726d33"
            + "|txt=sentence-transformers/clip-ViT-B-32-multilingual-v1@58edf8cada9e|w=0.7/0.3";
    static final float IMAGE_WEIGHT = 0.7f;
    static final float TEXT_WEIGHT = 0.3f;
    /** services/embedder/app.py MAX_TEXT; real product texts stay under ~450 characters. */
    static final int EMBEDDER_MAX_TEXT = 1000;
    private static final int MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    private static final Duration RETRY_AFTER_FAILURE = Duration.ofHours(6);
    private static final Logger log = LoggerFactory.getLogger(ProductEmbeddingService.class);

    enum Outcome { WRITTEN, SKIPPED, IMAGE_UNAVAILABLE, EMBEDDER_DOWN }

    private record ImageResult(byte[] bytes, boolean missing) {
        static final ImageResult MISSING = new ImageResult(null, true);
        static final ImageResult UNAVAILABLE = new ImageResult(null, false);
    }

    private static final String PRODUCT_SQL = """
            SELECT p.id, p.name, p.description, p.brand, p.product_type, p.material, p.style,
                   p.target_group, p.gender, c.name AS category_name,
                   (SELECT string_agg(DISTINCT t.tag, ',') FROM product_style_tags t WHERE t.product_id = p.id) AS style_tags,
                   (SELECT string_agg(DISTINCT t.tag, ',') FROM product_recommendation_tags t WHERE t.product_id = p.id) AS reco_tags,
                   (SELECT string_agg(x.color, ', ' ORDER BY x.n DESC, x.color) FROM (
                        SELECT v.color, count(*) AS n FROM product_variants v
                        WHERE v.product_id = p.id AND coalesce(v.color, '') <> ''
                        GROUP BY v.color ORDER BY n DESC, v.color LIMIT 3) x) AS colors,
                   (SELECT i.image_url FROM product_images i WHERE i.product_id = p.id
                    ORDER BY i.is_primary DESC NULLS LAST, i.sort_order NULLS LAST, i.id LIMIT 1) AS image_url
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE p.id = ?
            """;

    private static final String UPSERT_SQL = """
            INSERT INTO product_embeddings (product_id, embedding, source, model_version, input_hash, updated_at)
            VALUES (?, CAST(? AS vector), ?, ?, ?, now())
            ON CONFLICT (product_id) DO UPDATE
               SET embedding = EXCLUDED.embedding, source = EXCLUDED.source, model_version = EXCLUDED.model_version,
                   input_hash = EXCLUDED.input_hash, updated_at = now()
            """;

    private final EmbedderClient embedder;
    private final JdbcTemplate jdbc;
    private final Path uploadRoot;
    private final String imageBaseUrl;
    private final boolean enabled;
    private final int backfillBatch;
    private final Map<Long, Long> retryNotBefore = new ConcurrentHashMap<>();
    private volatile HttpClient http;

    public ProductEmbeddingService(EmbedderClient embedder, JdbcTemplate jdbc, UploadConfig uploadConfig,
                                   @Value("${app.embeddings.auto.enabled:true}") boolean enabled,
                                   @Value("${app.embeddings.image-base-url:http://127.0.0.1:3000}") String imageBaseUrl,
                                   @Value("${app.embeddings.backfill-batch:100}") int backfillBatch) {
        this.embedder = embedder;
        this.jdbc = jdbc;
        this.uploadRoot = uploadConfig.getUploadRoot();
        this.imageBaseUrl = imageBaseUrl.replaceAll("/+$", "");
        this.enabled = enabled;
        this.backfillBatch = backfillBatch;
    }

    @Async
    @TransactionalEventListener(fallbackExecution = true)
    public void onProductChanged(ProductContentChangedEvent event) {
        if (!enabled || event.productId() == null) return;
        Outcome o = safeRefresh(event.productId());
        if (o != Outcome.WRITTEN) {
            log.info("Embedding of product {} not refreshed ({}); the backfill job retries products without one",
                    event.productId(), o);
        }
    }

    @Scheduled(initialDelayString = "${app.embeddings.backfill-initial-delay-ms:120000}",
            fixedDelayString = "${app.embeddings.backfill-delay-ms:300000}")
    public void backfillMissing() {
        if (!enabled) return;
        List<Long> ids;
        try {
            ids = jdbc.queryForList("""
                    SELECT p.id FROM products p
                    WHERE p.status = 'ACTIVE'
                      AND NOT EXISTS (SELECT 1 FROM product_embeddings e WHERE e.product_id = p.id)
                    ORDER BY p.id
                    """, Long.class);
        } catch (Exception e) {
            log.warn("Embedding backfill skipped: {}", e.toString());
            return;
        }
        long now = System.currentTimeMillis();
        int written = 0, tried = 0;
        for (Long id : ids) {
            if (tried >= backfillBatch) break;
            Long notBefore = retryNotBefore.get(id);
            if (notBefore != null && notBefore > now) continue;
            tried++;
            Outcome o = safeRefresh(id);
            if (o == Outcome.WRITTEN) written++;
            else if (o == Outcome.EMBEDDER_DOWN) break;
            else retryNotBefore.put(id, now + RETRY_AFTER_FAILURE.toMillis());
        }
        if (tried > 0) {
            log.info("Embedding backfill: {} written, {} tried, {} active products were missing one",
                    written, tried, ids.size());
        }
    }

    Outcome safeRefresh(Long productId) {
        try {
            return refresh(productId);
        } catch (Exception e) {
            log.warn("Embedding of product {} failed: {}", productId, e.toString());
            return Outcome.SKIPPED;
        }
    }

    /** One product at a time: the embedder shares a 2-vCPU VPS with the shop. */
    synchronized Outcome refresh(Long productId) throws Exception {
        List<Map<String, Object>> rows = jdbc.queryForList(PRODUCT_SQL, productId);
        if (rows.isEmpty()) return Outcome.SKIPPED;
        Map<String, Object> row = rows.get(0);
        String text = buildText(row);
        if (text.isBlank()) return Outcome.SKIPPED;
        String imageUrl = (String) row.get("image_url");

        float[] vImg = null;
        if (imageUrl != null && !imageUrl.isBlank()) {
            ImageResult img = loadImage(imageUrl.trim());
            if (img.bytes() == null && !img.missing()) return Outcome.IMAGE_UNAVAILABLE;
            if (img.bytes() != null) {
                vImg = embedder.embedImage(img.bytes(), "product-" + productId, "application/octet-stream");
                if (vImg == null && embedder.isCoolingDown()) return Outcome.EMBEDDER_DOWN;
                // otherwise the embedder rejected the file (not an image): text-only, like the notebook
            }
        }
        float[] vTxt = embedder.embedText(truncate(text));
        if (vTxt == null) return Outcome.EMBEDDER_DOWN;

        float[] fused = vImg != null ? fuse(vImg, vTxt) : normalize(vTxt);
        String source = vImg != null ? "fused" : "text";
        jdbc.update(UPSERT_SQL, productId, EmbedderClient.toVectorLiteral(fused), source, MODEL_VERSION,
                inputHash(text, imageUrl));
        retryNotBefore.remove(productId);
        return Outcome.WRITTEN;
    }

    // ───────────────────────── text (port of build_text) ─────────────────────────

    private static final Map<String, String> PRODUCT_TYPE_VI = Map.ofEntries(
            Map.entry("tshirt", "áo thun"), Map.entry("polo", "áo polo"), Map.entry("shirt", "áo sơ mi"),
            Map.entry("pants", "quần"), Map.entry("shorts", "quần short"), Map.entry("skirt", "chân váy"),
            Map.entry("dress", "váy đầm"), Map.entry("outerwear", "áo khoác"),
            Map.entry("accessories", "phụ kiện"), Map.entry("homewear", "đồ mặc nhà"));
    private static final Map<String, String> TARGET_GROUP_VI =
            Map.of("men", "nam", "women", "nữ", "kids", "trẻ em", "family", "gia đình");
    private static final Map<String, String> GENDER_VI =
            Map.of("men", "nam", "women", "nữ", "girl", "bé gái", "boy", "bé trai");
    private static final Set<String> CODE_VALUES;
    static {
        Set<String> s = new java.util.HashSet<>();
        s.addAll(PRODUCT_TYPE_VI.keySet());
        s.addAll(TARGET_GROUP_VI.keySet());
        s.addAll(GENDER_VI.keySet());
        s.add("accessories");
        s.add("unisex");
        CODE_VALUES = Set.copyOf(s);
    }
    private static final Pattern SPACES = Pattern.compile("(?U)\\s+");
    private static final Pattern BULLET = Pattern.compile("(?U)(^|\\s)[-•–]\\s+");

    static String clean(Object v) {
        if (v == null) return "";
        return SPACES.matcher(v.toString()).replaceAll(" ").strip();
    }

    private static String lower(String s) {
        return s.toLowerCase(Locale.ROOT);
    }

    /** Mirrors build_text() in the notebook; keep both in sync. */
    static String buildText(Map<String, Object> row) {
        String name = clean(row.get("name"));
        List<String> parts = new ArrayList<>();
        parts.add(name);
        StringBuilder seen = new StringBuilder(lower(name));
        java.util.function.BiConsumer<Object, String> add = (raw, prefix) -> {
            String value = clean(raw);
            if (!value.isEmpty() && !seen.toString().contains(lower(value))) {
                parts.add(prefix + value);
                seen.append(" | ").append(lower(value));
            }
        };

        String category = clean(row.get("category_name"));
        if (!category.isEmpty() && !CODE_VALUES.contains(lower(category))) add.accept(category, "");
        add.accept(PRODUCT_TYPE_VI.getOrDefault(clean(row.get("product_type")), ""), "");
        String material = clean(row.get("material"));
        if (!lower(material).equals("mixed")) add.accept(material, "chất liệu ");
        add.accept(row.get("style"), "phong cách ");
        add.accept(row.get("colors"), "màu ");
        String gender = lower(clean(row.get("gender")));
        String target = lower(clean(row.get("target_group")));
        if (gender.equals("girl") || gender.equals("boy")) add.accept(GENDER_VI.get(gender), "dành cho ");
        else if (TARGET_GROUP_VI.containsKey(target)) add.accept(TARGET_GROUP_VI.get(target), "dành cho ");
        else if (GENDER_VI.containsKey(gender)) add.accept(GENDER_VI.get(gender), "dành cho ");
        if (gender.equals("unisex")) add.accept("unisex", "");

        List<String> tags = new ArrayList<>();
        for (Object src : new Object[]{row.get("style_tags"), row.get("reco_tags")}) {
            for (String t : clean(src).split(",", -1)) {
                t = t.strip();
                String tl = lower(t);
                if (!t.isEmpty() && !CODE_VALUES.contains(tl) && !seen.toString().contains(tl)
                        && tags.stream().noneMatch(x -> lower(x).equals(tl))) {
                    tags.add(t);
                }
            }
        }
        if (!tags.isEmpty()) {
            tags.sort(Comparator.comparing(ProductEmbeddingService::lower));
            add.accept(String.join(", ", tags), "");
        }
        add.accept(row.get("brand"), "thương hiệu ");
        String desc = stripChars(BULLET.matcher(clean(row.get("description"))).replaceAll("$1"), " .;");
        if (!desc.isEmpty() && !lower(name).contains(lower(desc))) {
            if (desc.length() > 200) {
                String cut = desc.substring(0, 200);
                int sp = cut.lastIndexOf(' ');
                desc = sp >= 0 ? cut.substring(0, sp) : cut;
            }
            add.accept(desc, "");
        }
        return String.join(", ", parts);
    }

    /** Python str.strip(chars). */
    static String stripChars(String s, String chars) {
        int a = 0, b = s.length();
        while (a < b && chars.indexOf(s.charAt(a)) >= 0) a++;
        while (b > a && chars.indexOf(s.charAt(b - 1)) >= 0) b--;
        return s.substring(a, b);
    }

    static String truncate(String text) {
        if (text.length() <= EMBEDDER_MAX_TEXT) return text;
        String cut = text.substring(0, EMBEDDER_MAX_TEXT);
        int sp = cut.lastIndexOf(' ');
        return (sp > EMBEDDER_MAX_TEXT / 2 ? cut.substring(0, sp) : cut).strip();
    }

    /** Same formula as the notebook when the full text was embedded; marked otherwise so it gets recomputed there. */
    static String inputHash(String text, String imageUrl) throws Exception {
        String version = text.length() <= EMBEDDER_MAX_TEXT ? MODEL_VERSION : MODEL_VERSION + "|auto-truncated";
        String in = version + "\n" + text + "\n" + (imageUrl == null ? "" : imageUrl);
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(in.getBytes(StandardCharsets.UTF_8)));
    }

    // ───────────────────────── vectors ─────────────────────────

    static float[] normalize(float[] v) {
        double n = 0;
        for (float x : v) n += (double) x * x;
        n = Math.sqrt(n);
        if (n <= 1e-12) throw new IllegalArgumentException("zero vector");
        float[] out = new float[v.length];
        for (int i = 0; i < v.length; i++) out[i] = (float) (v[i] / n);
        return out;
    }

    /** Inputs come L2-normalised from the embedder, like v_img / v_txt in the notebook. */
    static float[] fuse(float[] vImg, float[] vTxt) {
        if (vImg.length != vTxt.length) throw new IllegalArgumentException("dimension mismatch");
        float[] mixed = new float[vImg.length];
        for (int i = 0; i < mixed.length; i++) mixed[i] = IMAGE_WEIGHT * vImg[i] + TEXT_WEIGHT * vTxt[i];
        return normalize(mixed);
    }

    // ───────────────────────── images ─────────────────────────

    private ImageResult loadImage(String url) {
        try {
            if (url.startsWith("/api/uploads/")) {
                Path file = uploadRoot.resolve(url.substring("/api/uploads/".length())).normalize();
                // A missing upload usually means this instance lacks the files (e.g. local dev on the
                // shared DB), not that the photo is gone: retry later instead of writing a text-only vector.
                if (!file.startsWith(uploadRoot) || !Files.isRegularFile(file)) return ImageResult.UNAVAILABLE;
                if (Files.size(file) > MAX_IMAGE_BYTES) return ImageResult.MISSING;
                return new ImageResult(Files.readAllBytes(file), false);
            }
            String full = url.startsWith("/") ? imageBaseUrl + url : url;
            if (!full.startsWith("http://") && !full.startsWith("https://")) return ImageResult.MISSING;
            HttpResponse<byte[]> res = client().send(HttpRequest.newBuilder(URI.create(full))
                    .timeout(Duration.ofSeconds(15)).header("User-Agent", "ettee-embedding/1.0").GET().build(),
                    HttpResponse.BodyHandlers.ofByteArray());
            int s = res.statusCode();
            if (s == 404 || s == 410) return ImageResult.MISSING;
            if (s != 200) return ImageResult.UNAVAILABLE;
            byte[] body = res.body();
            if (body.length == 0 || body.length > MAX_IMAGE_BYTES) return ImageResult.MISSING;
            return new ImageResult(body, false);
        } catch (IllegalArgumentException e) {
            return ImageResult.MISSING; // malformed URL
        } catch (Exception e) {
            return ImageResult.UNAVAILABLE;
        }
    }

    private HttpClient client() {
        HttpClient c = http;
        if (c == null) {
            synchronized (this) {
                if (http == null) http = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1)
                        .followRedirects(HttpClient.Redirect.NORMAL).connectTimeout(Duration.ofSeconds(5)).build();
                c = http;
            }
        }
        return c;
    }
}
