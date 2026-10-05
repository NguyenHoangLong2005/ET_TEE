package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.entity.Order;
import com.nguyenhoanglong.repository.OrderRepository;
import com.nguyenhoanglong.service.BankTransferPaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * SePay calls this for every transaction on the linked bank account
 * (https://docs.sepay.vn/tich-hop-webhooks.html). An incoming transfer whose content carries an
 * order code, for at least the order total, marks that order paid.
 *
 * <p>Public path (/api/public/**); authenticated by the "Authorization: Apikey ..." header SePay
 * sends, compared against SEPAY_WEBHOOK_API_KEY. With no key configured every call is refused.
 *
 * <p>Always answers 200 {"success": true} once the call is authenticated, even when the transfer
 * matches nothing, so SePay doesn't retry it; mismatches are logged for staff to reconcile.
 */
@RestController
@RequestMapping("/api/public/payments")
public class SepayWebhookController {

    private static final Logger log = LoggerFactory.getLogger(SepayWebhookController.class);
    // OrderService.checkout: "DH" + 10 uppercase hex chars. Banks may drop spaces or change case.
    private static final Pattern ORDER_CODE = Pattern.compile("DH[0-9A-F]{10}");

    private final OrderRepository orders;
    private final BankTransferPaymentService bankTransferPaymentService;
    private final String apiKey;

    public SepayWebhookController(OrderRepository orders,
                                  BankTransferPaymentService bankTransferPaymentService,
                                  @Value("${app.payment.sepay.webhook-api-key:}") String apiKey) {
        this.orders = orders;
        this.bankTransferPaymentService = bankTransferPaymentService;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
    }

    @PostMapping("/sepay")
    public ResponseEntity<Map<String, Object>> handle(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody Map<String, Object> body) {
        if (apiKey.isEmpty()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("success", false, "message", "SePay webhook chưa được cấu hình"));
        }
        if (!authorized(authorization)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("success", false));
        }

        Object txId = body.get("id");
        if (!"in".equalsIgnoreCase(String.valueOf(body.get("transferType")))) {
            return ok(); // outgoing transfer
        }
        BigDecimal amount;
        try {
            amount = new BigDecimal(String.valueOf(body.get("transferAmount")));
        } catch (NumberFormatException e) {
            log.warn("SePay tx {}: unreadable transferAmount {}", txId, body.get("transferAmount"));
            return ok();
        }

        Optional<String> code = findOrderCode(body.get("code")).or(() -> findOrderCode(body.get("content")));
        if (code.isEmpty()) {
            log.info("SePay tx {}: no order code in content '{}'", txId, body.get("content"));
            return ok();
        }
        Optional<Order> found = orders.findByOrderCode(code.get());
        if (found.isEmpty()) {
            log.warn("SePay tx {}: order {} not found", txId, code.get());
            return ok();
        }
        Order order = found.get();
        if (BankTransferPaymentService.isPaid(order)) {
            return ok(); // retry, or a second transfer for the same order
        }
        BigDecimal due = BigDecimal.valueOf(order.getTotalAmount() == null ? 0 : order.getTotalAmount());
        if (amount.compareTo(due) < 0) {
            log.warn("SePay tx {}: order {} received {} but total is {}; left unpaid for staff", txId, order.getOrderCode(), amount, due);
            return ok();
        }
        try {
            bankTransferPaymentService.markPaid(order, "SEPAY",
                    "Tự động xác nhận chuyển khoản qua SePay (giao dịch " + txId + ", " + amount.toPlainString() + "đ)");
        } catch (RuntimeException e) {
            // e.g. the order was cancelled before the money arrived: needs a refund, not a status flip.
            log.warn("SePay tx {}: could not mark order {} paid: {}", txId, order.getOrderCode(), e.getMessage());
        }
        return ok();
    }

    private boolean authorized(String header) {
        if (header == null) return false;
        String given = header.trim();
        if (given.regionMatches(true, 0, "Apikey ", 0, 7)) given = given.substring(7).trim();
        return MessageDigest.isEqual(given.getBytes(StandardCharsets.UTF_8), apiKey.getBytes(StandardCharsets.UTF_8));
    }

    private static Optional<String> findOrderCode(Object text) {
        if (text == null) return Optional.empty();
        Matcher m = ORDER_CODE.matcher(String.valueOf(text).toUpperCase());
        return m.find() ? Optional.of(m.group()) : Optional.empty();
    }

    private static ResponseEntity<Map<String, Object>> ok() {
        return ResponseEntity.ok(Map.of("success", true));
    }
}
