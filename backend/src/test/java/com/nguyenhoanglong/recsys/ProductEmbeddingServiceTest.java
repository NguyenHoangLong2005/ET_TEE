package com.nguyenhoanglong.recsys;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class ProductEmbeddingServiceTest {

    /**
     * buildtext_fixture.json: 300 real products with the text produced by build_text() of
     * scripts/embeddings/colab_product_embeddings.py. The Java port must give the same string, otherwise
     * automatically embedded products land somewhere else in the vector space than notebook ones.
     */
    @Test
    void buildTextMatchesTheNotebook() throws Exception {
        List<Map<String, Object>> rows;
        try (InputStream in = getClass().getResourceAsStream("/embeddings/buildtext_fixture.json")) {
            rows = new ObjectMapper().readValue(in, new TypeReference<>() {});
        }
        assertThat(rows).hasSizeGreaterThan(100);
        List<String> mismatches = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            Map<String, Object> row = new HashMap<>(r);
            String expected = (String) row.remove("expected");
            String actual = ProductEmbeddingService.buildText(row);
            if (!expected.equals(actual)) {
                mismatches.add("#" + r.get("id") + "\n  py:   " + expected + "\n  java: " + actual);
            }
        }
        assertThat(mismatches).as(String.join("\n", mismatches)).isEmpty();
    }

    @Test
    void inputHashUsesTheNotebookFormula() throws Exception {
        // python: sha256(f"{MODEL_VERSION}\n{text}\n{url or ''}")
        String h = ProductEmbeddingService.inputHash("Áo thun nam", "/api/uploads/products/mirror/a.webp");
        String expected = java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                .digest((ProductEmbeddingService.MODEL_VERSION + "\nÁo thun nam\n/api/uploads/products/mirror/a.webp")
                        .getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        assertThat(h).isEqualTo(expected);
        assertThat(ProductEmbeddingService.inputHash("x", null))
                .isEqualTo(java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                        .digest((ProductEmbeddingService.MODEL_VERSION + "\nx\n")
                                .getBytes(java.nio.charset.StandardCharsets.UTF_8))));
    }

    @Test
    void fuseWeightsImageAndTextThenNormalises() {
        float[] img = {1, 0};
        float[] txt = {0, 1};
        float[] f = ProductEmbeddingService.fuse(img, txt);
        double n = Math.sqrt(0.7 * 0.7 + 0.3 * 0.3);
        assertThat((double) f[0]).isCloseTo(0.7 / n, within(1e-6));
        assertThat((double) f[1]).isCloseTo(0.3 / n, within(1e-6));
    }

    @Test
    void stripCharsBehavesLikePythonStrip() {
        assertThat(ProductEmbeddingService.stripChars(" ..abc; .", " .;")).isEqualTo("abc");
        assertThat(ProductEmbeddingService.stripChars("...", " .;")).isEmpty();
    }
}
