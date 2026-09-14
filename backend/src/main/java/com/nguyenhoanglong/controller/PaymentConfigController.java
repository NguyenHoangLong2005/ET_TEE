package com.nguyenhoanglong.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payment-methods")
public class PaymentConfigController {

    @Value("${app.payment.bank.account-name}")
    private String accountName;

    @Value("${app.payment.bank.account-number}")
    private String accountNumber;

    @Value("${app.payment.bank.name}")
    private String bankName;

    @Value("${app.payment.bank.qr-url}")
    private String qrUrl;

    @GetMapping("/bank-transfer")
    public ResponseEntity<Map<String, Object>> getBankTransferConfig() {
        Map<String, Object> data = new HashMap<>();
        data.put("accountName", accountName);
        data.put("accountNumber", accountNumber);
        data.put("bankName", bankName);
        data.put("qrUrl", qrUrl);
        data.put("transferContentTemplate", "ETTEE {orderCode} {phone}");
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", data);

        return ResponseEntity.ok(response);
    }
}
