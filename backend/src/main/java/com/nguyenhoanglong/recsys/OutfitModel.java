package com.nguyenhoanglong.recsys;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.*;

/**
 * Outfit compatibility model trained by scripts/outfit/train_outfit.py (Conditional Similarity
 * Network on CLIP vectors): outfit.bin holds each product's projected vector, outfit.json the
 * per-slot-pair masks and the outfit templates.
 *
 *   compat(a, b) = sum_k mask[slot(a), slot(b)][k] * v_a[k] * v_b[k] + bias[b]
 *
 * bias[b] is how often b gets picked as a partner at all (the popularity part of BPR).
 *
 * Files come from the live model directory once the retraining pipeline has promoted a version,
 * otherwise from the jar ({@link ModelFiles}); {@link #reloadIfChanged()} swaps versions without a
 * restart. Unavailable (files missing / unreadable) means the caller keeps the rule-based outfit.
 */
@Component
public class OutfitModel {

    private static final Logger log = LoggerFactory.getLogger(OutfitModel.class);
    private static final String MARKER = "outfit.json";

    private record State(Map<Long, Integer> indexOf, long[] productIds, String[] groups, int[] slots,
                         float[][] vectors, float[][] masks, float[] bias, List<String> slotNames,
                         Map<String, String> slotOfType, Map<String, List<String>> template,
                         String version, String stamp) {
        static State empty(String stamp) {
            return new State(Map.of(), new long[0], new String[0], new int[0], new float[0][], new float[0][],
                    new float[0], List.of(), Map.of(), Map.of(), "", stamp);
        }
    }

    private final ModelFiles files;
    private volatile State state;

    public OutfitModel(@Value("${app.recsys.model-dir:models-live}") String modelDir) {
        this.files = new ModelFiles(modelDir, "outfit");
    }

    public boolean isAvailable() {
        return current().vectors().length > 0;
    }

    public String version() {
        return current().version();
    }

    public boolean knows(long productId) {
        return current().indexOf().containsKey(productId);
    }

    /** Slot name of a product type (top / bottom / dress / outer / accessory), null if not wearable in an outfit. */
    public String slotOfType(String productType) {
        return productType == null ? null : current().slotOfType().get(productType.toLowerCase());
    }

    /** Slots to fill for an outfit around an item in {@code slot}, in display order. */
    public List<String> templateFor(String slot) {
        return current().template().getOrDefault(slot, List.of());
    }

    /** Product ids the model knows in a slot whose customer group fits {@code group} (same or unisex). */
    public List<Long> candidates(String slot, String group) {
        State s = current();
        int slotIndex = s.slotNames().indexOf(slot);
        List<Long> out = new ArrayList<>();
        for (int i = 0; i < s.productIds().length; i++) {
            if (s.slots()[i] == slotIndex && groupFits(group, s.groups()[i])) out.add(s.productIds()[i]);
        }
        return out;
    }

    public double compat(long a, long b) {
        State s = current();
        Integer ia = s.indexOf().get(a), ib = s.indexOf().get(b);
        if (ia == null || ib == null) return Double.NEGATIVE_INFINITY;
        int n = s.slotNames().size();
        float[] m = s.masks()[Math.min(s.slots()[ia], s.slots()[ib]) * n + Math.max(s.slots()[ia], s.slots()[ib])];
        float[] va = s.vectors()[ia], vb = s.vectors()[ib];
        double score = 0;
        for (int k = 0; k < m.length; k++) score += m[k] * va[k] * vb[k];
        return score + s.bias()[ib];
    }

    /** Same rule as compatible_groups() in train_outfit.py. */
    static boolean groupFits(String anchorGroup, String candidateGroup) {
        return "unisex".equals(anchorGroup) || "unisex".equals(candidateGroup) || anchorGroup.equals(candidateGroup);
    }

    public static String groupOf(String targetGroup) {
        String g = targetGroup == null ? "" : targetGroup.toLowerCase();
        return Set.of("men", "women", "kids").contains(g) ? g : "unisex";
    }

    /** Called periodically by {@link ModelReloader}: loads a newly promoted version, if any. */
    public synchronized boolean reloadIfChanged() {
        String stamp = files.stamp(MARKER);
        if (state != null && stamp.equals(state.stamp())) return false;
        State next = load(stamp);
        if (next.vectors().length == 0 && state != null && state.vectors().length > 0) {
            log.warn("New outfit model files could not be loaded - keeping {}", state.version());
            return false;
        }
        state = next;
        return true;
    }

    private State current() {
        State s = state;
        if (s == null) {
            reloadIfChanged();
            s = state;
        }
        return s;
    }

    private State load(String stamp) {
        boolean live = files.live(MARKER);
        try {
            Resource bin = files.resource("outfit.bin", live);
            Resource json = files.resource(MARKER, live);
            if (!bin.exists() || !json.exists()) {
                log.info("Outfit model not found at {} - PDP keeps the rule-based outfit", files.describe(live));
                return State.empty(stamp);
            }
            JsonNode meta;
            try (InputStream in = json.getInputStream()) {
                meta = new ObjectMapper().readTree(in);
            }
            int dim = meta.get("dim").asInt();
            List<String> names = new ArrayList<>();
            meta.get("slots").forEach(node -> names.add(node.asText()));
            Map<String, String> typeSlot = new HashMap<>();
            meta.get("slot_of_type").fields().forEachRemaining(e -> typeSlot.put(e.getKey(), e.getValue().asText()));
            Map<String, List<String>> tpl = new HashMap<>();
            meta.get("template").fields().forEachRemaining(e -> {
                List<String> l = new ArrayList<>();
                e.getValue().forEach(node -> l.add(node.asText()));
                tpl.put(e.getKey(), List.copyOf(l));
            });
            float[][] m = new float[meta.get("masks").size()][dim];
            for (int p = 0; p < m.length; p++) {
                for (int k = 0; k < dim; k++) m[p][k] = (float) meta.get("masks").get(p).get(k).asDouble();
            }
            int n = meta.get("product_ids").size();
            long[] ids = new long[n];
            String[] grp = new String[n];
            int[] sl = new int[n];
            float[] b = new float[n];
            Map<Long, Integer> idx = new HashMap<>();
            for (int i = 0; i < n; i++) {
                ids[i] = meta.get("product_ids").get(i).asLong();
                grp[i] = meta.get("groups").get(i).asText();
                sl[i] = names.indexOf(meta.get("item_slots").get(i).asText());
                b[i] = (float) meta.get("bias").get(i).asDouble();
                idx.put(ids[i], i);
            }
            float[][] vec = new float[n][dim];
            try (InputStream in = bin.getInputStream()) {
                ByteBuffer buf = ByteBuffer.wrap(in.readAllBytes()).order(ByteOrder.LITTLE_ENDIAN);
                for (int i = 0; i < n; i++) for (int k = 0; k < dim; k++) vec[i][k] = buf.getFloat();
            }
            String version = meta.path("model").asText("outfit") + " @ " + meta.path("trained_at").asText("");
            log.info("Outfit model loaded from {}: {} products, {} slots, {}", files.describe(live), n, names.size(), version);
            return new State(Map.copyOf(idx), ids, grp, sl, vec, m, b, List.copyOf(names), Map.copyOf(typeSlot),
                    Map.copyOf(tpl), version, stamp);
        } catch (Throwable t) {
            log.warn("Outfit model could not be loaded from {}", files.describe(live), t);
            return State.empty(stamp);
        }
    }
}
