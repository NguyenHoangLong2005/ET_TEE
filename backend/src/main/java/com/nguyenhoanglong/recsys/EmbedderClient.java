package com.nguyenhoanglong.recsys;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

/**
 * Client of the query encoder (services/embedder/app.py): search phrase / photo -> 512-d CLIP vector in
 * the same space as product_embeddings. Optional: when it is down the caller falls back to keyword
 * search; after a failure it is not called again for {@link #COOL_DOWN} so a dead service does not add
 * a timeout to every search.
 */
@Component
public class EmbedderClient {

    static final Duration COOL_DOWN = Duration.ofSeconds(30);
    private static final Duration TIMEOUT = Duration.ofSeconds(3);
    /** An image encode is ~10x a text one on CPU; the photo search can afford to wait longer. */
    private static final Duration IMAGE_TIMEOUT = Duration.ofSeconds(10);
    private static final Logger log = LoggerFactory.getLogger(EmbedderClient.class);

    private final String baseUrl;
    private final ObjectMapper mapper = new ObjectMapper();
    private volatile HttpClient http;                 // lazy, like PayOsService
    private volatile long downUntil;

    public EmbedderClient(@Value("${app.search.embedder-url:http://127.0.0.1:8090}") String baseUrl) {
        this.baseUrl = baseUrl.replaceAll("/+$", "");
    }

    /** Vector or null (service unavailable / rejected the input). */
    public float[] embedText(String text) {
        try {
            byte[] body = mapper.writeValueAsBytes(Map.of("text", text));
            return call(HttpRequest.newBuilder(URI.create(baseUrl + "/embed/text"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(body)), TIMEOUT);
        } catch (Exception e) {
            return failed(e);
        }
    }

    public float[] embedImage(byte[] image, String filename, String contentType) {
        try {
            String boundary = "----ettee" + UUID.randomUUID().toString().replace("-", "");
            ByteArrayOutputStream out = new ByteArrayOutputStream(image.length + 512);
            String safeName = filename == null ? "upload" : filename.replaceAll("[\"\\r\\n]", "_");
            out.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"" + safeName
                    + "\"\r\nContent-Type: " + (contentType == null ? "application/octet-stream" : contentType)
                    + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
            out.write(image);
            out.write(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
            return call(HttpRequest.newBuilder(URI.create(baseUrl + "/embed/image"))
                    .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(out.toByteArray())), IMAGE_TIMEOUT);
        } catch (Exception e) {
            return failed(e);
        }
    }

    public boolean isCoolingDown() {
        return System.currentTimeMillis() < downUntil;
    }

    private float[] call(HttpRequest.Builder request, Duration timeout) throws Exception {
        if (isCoolingDown()) return null;
        HttpResponse<String> res = client().send(request.timeout(timeout).build(),
                HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (res.statusCode() >= 500) throw new IllegalStateException("embedder HTTP " + res.statusCode());
        if (res.statusCode() != 200) return null;          // bad input (not an image, too large): not an outage
        JsonNode vec = mapper.readTree(res.body()).get("vector");
        float[] out = new float[vec.size()];
        for (int i = 0; i < out.length; i++) out[i] = (float) vec.get(i).asDouble();
        return out;
    }

    private float[] failed(Exception e) {
        downUntil = System.currentTimeMillis() + COOL_DOWN.toMillis();
        log.warn("Query embedder unavailable at {} ({}); keyword search only for {}s",
                baseUrl, e.toString(), COOL_DOWN.toSeconds());
        return null;
    }

    private HttpClient client() {
        HttpClient c = http;
        if (c == null) {
            synchronized (this) {
                // HTTP/1.1: the default h2c upgrade attempt on a POST stalls uvicorn until the timeout
                if (http == null) http = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1)
                        .connectTimeout(TIMEOUT).build();
                c = http;
            }
        }
        return c;
    }

    /** pgvector literal "[x,y,...]". */
    public static String toVectorLiteral(float[] v) {
        StringBuilder sb = new StringBuilder(v.length * 10).append('[');
        for (int i = 0; i < v.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(v[i]);
        }
        return sb.append(']').toString();
    }
}
