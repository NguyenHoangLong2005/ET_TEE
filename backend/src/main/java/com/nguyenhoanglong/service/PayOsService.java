package com.nguyenhoanglong.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nguyenhoanglong.entity.Order;
import com.nguyenhoanglong.entity.OrderStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * PayOS hosted checkout (https://payos.vn/docs/api/). The customer is sent to PayOS, pays by QR,
 * and PayOS redirects back to the order page; that page then asks us to {@link #sync} the order,
 * which reads the payment status from the PayOS API. Because our server calls PayOS (not the other
 * way round), this works on localhost with no public webhook URL, unlike SePay.
 *
 * <p>The PayOS orderCode is our numeric order id; PayOS requires a number and our order codes are
 * "DH..." strings.
 */
@Service
public class PayOsService {

    private static final Logger log = LoggerFactory.getLogger(PayOsService.class);
    private static final String API = "https://api-merchant.payos.vn/v2/payment-requests";
    // PayOS: "Đơn thanh toán đã tồn tại" when a link was already created for this orderCode.
    private static final String CODE_ALREADY_EXISTS = "231";

    private final String clientId;
    private final String apiKey;
    private final String checksumKey;
    private final String frontendUrl;
    private final BankTransferPaymentService bankTransferPaymentService;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public PayOsService(@Value("${app.payment.payos.client-id:}") String clientId,
                        @Value("${app.payment.payos.api-key:}") String apiKey,
                        @Value("${app.payment.payos.checksum-key:}") String checksumKey,
                        @Value("${app.frontend-url:http://localhost:3000}") String frontendUrl,
                        BankTransferPaymentService bankTransferPaymentService) {
        this.clientId = clean(clientId);
        this.apiKey = clean(apiKey);
        this.checksumKey = clean(checksumKey);
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
        this.bankTransferPaymentService = bankTransferPaymentService;
    }

    // Keys copied from the old PHP project's .env may be wrapped in quotes, which its env() helper
    // stripped but spring-dotenv keeps.
    private static String clean(String v) {
        if (v == null) return "";
        String t = v.trim();
        if (t.length() >= 2 && (t.startsWith("\"") && t.endsWith("\"") || t.startsWith("'") && t.endsWith("'"))) {
            t = t.substring(1, t.length() - 1).trim();
        }
        return t;
    }

    public boolean isEnabled() {
        return !clientId.isEmpty() && !apiKey.isEmpty() && !checksumKey.isEmpty();
    }

    /** Checkout URL on PayOS for a bank-transfer order still waiting for payment. */
    public String createCheckoutUrl(Order order) {
        requireEnabled();
        if (!"BANK_TRANSFER".equalsIgnoreCase(order.getPaymentMethod())
                || order.getStatus() != OrderStatus.PENDING_PAYMENT
                || BankTransferPaymentService.isPaid(order)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn hàng không còn chờ thanh toán chuyển khoản");
        }
        long amount = Math.round(order.getTotalAmount() == null ? 0 : order.getTotalAmount());
        String returnUrl = frontendUrl + "/order-success/" + order.getOrderCode();
        String cancelUrl = returnUrl + "?payos=cancelled";
        // Shown in the customer's bank app; PayOS caps it at 25 characters.
        String description = order.getOrderCode();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("orderCode", order.getId());
        body.put("amount", amount);
        body.put("description", description);
        body.put("returnUrl", returnUrl);
        body.put("cancelUrl", cancelUrl);
        body.put("signature", hmac("amount=" + amount + "&cancelUrl=" + cancelUrl + "&description=" + description
                + "&orderCode=" + order.getId() + "&returnUrl=" + returnUrl));

        JsonNode res = call(HttpRequest.newBuilder(URI.create(API))
                .POST(HttpRequest.BodyPublishers.ofString(write(body))));
        if ("00".equals(res.path("code").asText())) {
            return res.path("data").path("checkoutUrl").asText();
        }
        if (CODE_ALREADY_EXISTS.equals(res.path("code").asText())) {
            // Customer came back to pay again: reuse the open link rather than failing.
            JsonNode info = paymentInfo(order.getId());
            if ("PENDING".equals(info.path("status").asText()) && info.path("amount").asLong() == amount) {
                return "https://pay.payos.vn/web/" + info.path("id").asText();
            }
        }
        log.warn("PayOS create link failed for {}: {} {}", order.getOrderCode(), res.path("code").asText(), res.path("desc").asText());
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Không tạo được thanh toán PayOS: " + res.path("desc").asText());
    }

    /**
     * Reads the PayOS status and marks the order paid when PayOS says it is. Safe to call
     * repeatedly; does nothing when PayOS is off, no link exists, or the order is settled.
     *
     * @return the PayOS status (PENDING, PAID, CANCELLED, EXPIRED, ...) or null when not applicable.
     */
    public String sync(Order order) {
        if (!isEnabled() || !"BANK_TRANSFER".equalsIgnoreCase(order.getPaymentMethod())) return null;
        if (BankTransferPaymentService.isPaid(order)) return "PAID";
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) return null;

        JsonNode info;
        try {
            info = paymentInfo(order.getId());
        } catch (ResponseStatusException e) {
            // Usually no PayOS link for this order (paid by plain QR transfer, or never opened).
            log.debug("PayOS status unavailable for {}: {}", order.getOrderCode(), e.getReason());
            return null;
        }
        log.info("PayOS status for {}: {} (paid {} / due {})", order.getOrderCode(),
                info.path("status").asText(), info.path("amountPaid").asLong(),
                Math.round(order.getTotalAmount() == null ? 0 : order.getTotalAmount()));
        String status = info.path("status").asText(null);
        long due = Math.round(order.getTotalAmount() == null ? 0 : order.getTotalAmount());
        if ("PAID".equals(status) && info.path("amountPaid").asLong() >= due) {
            bankTransferPaymentService.markPaid(order, "PAYOS",
                    "Thanh toán qua PayOS (mã thanh toán " + info.path("id").asText() + ")");
        }
        return status;
    }

    private JsonNode paymentInfo(Long orderCode) {
        JsonNode res = call(HttpRequest.newBuilder(URI.create(API + "/" + orderCode)).GET());
        if (!"00".equals(res.path("code").asText())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, res.path("desc").asText());
        }
        return res.path("data");
    }

    private JsonNode call(HttpRequest.Builder builder) {
        try {
            HttpResponse<String> res = http.send(builder
                    .timeout(Duration.ofSeconds(15))
                    .header("x-client-id", clientId)
                    .header("x-api-key", apiKey)
                    .header("Content-Type", "application/json")
                    .build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            return mapper.readTree(res.body());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "PayOS không phản hồi");
        } catch (Exception e) {
            log.warn("PayOS call failed: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "PayOS không phản hồi");
        }
    }

    private String hmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(checksumKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private String write(Object o) {
        try {
            return mapper.writeValueAsString(o);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private void requireEnabled() {
        if (!isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Chưa cấu hình PayOS");
        }
    }
}
