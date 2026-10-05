package com.nguyenhoanglong.recsys;

import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtSession;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.*;

/**
 * SASRec next-item model trained by scripts/sasrec/train.py and exported to ONNX
 * (sasrec.onnx + items.json). Input: the shopper's recent product ids, oldest first, already
 * collapsed (see {@link #toSequence}); output: product ids ranked by predicted interest.
 *
 * Files come from the live model directory once the retraining pipeline has promoted a version,
 * otherwise from the jar ({@link ModelFiles}). {@link #reloadIfChanged()} swaps in a newly promoted
 * version without a restart. When nothing can be loaded the model is unavailable and the caller falls
 * back to the CLIP-based ranking.
 */
@Component
public class SasrecModel {

    private static final Logger log = LoggerFactory.getLogger(SasrecModel.class);
    private static final String MARKER = "items.json";

    /** Everything one loaded version needs; replaced as a whole on reload. */
    private record State(OrtSession session, long[] productIds, Map<Long, Integer> indexOf, int maxlen,
                         String version, String stamp) {
        static State empty(String stamp) {
            return new State(null, new long[0], Map.of(), 0, "", stamp);
        }
    }

    private final ModelFiles files;
    private volatile State state;
    /** Previous session, closed on the next reload so in-flight requests can finish with it. */
    private OrtSession retired;

    public SasrecModel(@Value("${app.recsys.model-dir:models-live}") String modelDir) {
        this.files = new ModelFiles(modelDir, "sasrec");
    }

    public boolean isAvailable() {
        return current().session() != null;
    }

    public String version() {
        return current().version();
    }

    public int maxlen() {
        return current().maxlen();
    }

    /**
     * Same rule as build_sequence() in scripts/sasrec/data.py: drop products the model does not know,
     * collapse consecutive repeats (VIEW then ADD_TO_CART of one item is one step), keep the last maxlen.
     */
    public List<Long> toSequence(List<Long> chronologicalProductIds) {
        State s = current();
        List<Long> seq = new ArrayList<>();
        for (Long id : chronologicalProductIds) {
            if (id == null || !s.indexOf().containsKey(id)) continue;
            if (!seq.isEmpty() && seq.get(seq.size() - 1).equals(id)) continue;
            seq.add(id);
        }
        return seq.size() > s.maxlen() ? seq.subList(seq.size() - s.maxlen(), seq.size()) : seq;
    }

    /** Top product ids for the sequence, best first, skipping {@code exclude}. Empty if unavailable. */
    public List<Long> recommend(List<Long> sequence, int k, Set<Long> exclude) {
        State s = current();
        if (s.session() == null || sequence.isEmpty()) return List.of();
        int maxlen = s.maxlen();
        long[][] input = new long[1][maxlen];
        int offset = maxlen - sequence.size();      // left padding with 0, like pad_left() in model.py
        for (int i = 0; i < sequence.size(); i++) {
            Integer idx = s.indexOf().get(sequence.get(i));
            if (idx != null) input[0][offset + i] = idx;
        }
        float[] scores;
        try (OnnxTensor tensor = OnnxTensor.createTensor(OrtEnvironment.getEnvironment(), input);
             OrtSession.Result result = s.session().run(Map.of("seq", tensor))) {
            scores = ((float[][]) result.get(0).getValue())[0];
        } catch (Exception e) {
            log.warn("SASRec inference failed", e);
            return List.of();
        }
        // partial selection: k is small, the catalogue a few thousand items
        PriorityQueue<Integer> heap = new PriorityQueue<>(Comparator.comparingDouble(i -> scores[i]));
        for (int i = 1; i < scores.length; i++) {
            if (exclude.contains(s.productIds()[i])) continue;
            heap.offer(i);
            if (heap.size() > k) heap.poll();
        }
        List<Long> top = new ArrayList<>(heap.size());
        while (!heap.isEmpty()) top.add(s.productIds()[heap.poll()]);
        Collections.reverse(top);
        return top;
    }

    /** Called periodically by {@link ModelReloader}: loads a newly promoted version, if any. */
    public synchronized boolean reloadIfChanged() {
        String stamp = files.stamp(MARKER);
        if (state != null && stamp.equals(state.stamp())) return false;
        State next = load(stamp);
        if (next.session() == null && state != null && state.session() != null) {
            log.warn("New SASRec files could not be loaded - keeping {}", state.version());
            return false;
        }
        closeQuietly(retired);
        retired = state == null ? null : state.session();
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
            Resource onnx = files.resource("sasrec.onnx", live);
            Resource items = files.resource(MARKER, live);
            if (!onnx.exists() || !items.exists()) {
                log.info("SASRec model not found at {} - home feed uses the CLIP fallback", files.describe(live));
                return State.empty(stamp);
            }
            JsonNode meta;
            try (InputStream in = items.getInputStream()) {
                meta = new ObjectMapper().readTree(in);
            }
            long[] ids = new long[meta.get("product_ids").size()];
            Map<Long, Integer> index = new HashMap<>();
            for (int i = 0; i < ids.length; i++) {
                ids[i] = meta.get("product_ids").get(i).asLong();
                if (i > 0) index.put(ids[i], i);
            }
            byte[] model;
            try (InputStream in = onnx.getInputStream()) {
                model = in.readAllBytes();
            }
            OrtSession session = OrtEnvironment.getEnvironment().createSession(model, new OrtSession.SessionOptions());
            String version = meta.path("model").asText("SASRec") + " @ " + meta.path("trained_at").asText("");
            log.info("SASRec loaded from {}: {} items, maxlen {}, {}", files.describe(live), ids.length - 1,
                    meta.get("maxlen").asInt(), version);
            return new State(session, ids, Map.copyOf(index), meta.get("maxlen").asInt(), version, stamp);
        } catch (Throwable t) {
            // native library refused, corrupt file...: serve the fallback instead of failing requests
            log.warn("SASRec model could not be loaded from {}", files.describe(live), t);
            return State.empty(stamp);
        }
    }

    private static void closeQuietly(OrtSession session) {
        try {
            if (session != null) session.close();
        } catch (Exception ignored) {
            // already closed / shutting down
        }
    }

    @PreDestroy
    synchronized void close() {
        closeQuietly(retired);
        if (state != null) closeQuietly(state.session());
    }
}
