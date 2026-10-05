package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.CheckoutRequest;
import com.nguyenhoanglong.dto.OrderResponse;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import com.nguyenhoanglong.repository.UserRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private com.nguyenhoanglong.service.PayOsService payOsService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.nguyenhoanglong.service.BehaviorEventService behaviorEventService;

    private User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
            return userRepository.findByEmail(auth.getName()).orElse(null);
        }
        return null;
    }

    @PostMapping("/checkout")
    public ResponseEntity<Map<String, Object>> checkout(
            @RequestHeader(value = "X-Guest-Cart-Token", required = false) String guestToken,
            @RequestHeader(value = "X-Behavior-Session", required = false) String behaviorSession,
            @RequestHeader(value = "User-Agent", required = false) String userAgent,
            @RequestBody CheckoutRequest request) {
        
        User user = getCurrentUser();
        OrderResponse orderResponse = orderService.checkout(user, guestToken, request);
        behaviorEventService.recordPurchase(
                com.nguyenhoanglong.service.BehaviorEventService.resolveUserKey(user != null ? user.getId() : null, guestToken),
                orderResponse.getOrderCode(), behaviorSession, userAgent);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Đặt hàng thành công");
        response.put("data", orderResponse);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMyOrders() {
        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        List<OrderResponse> orders = orderService.getMyOrders(user);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", orders);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{orderCode}")
    public ResponseEntity<Map<String, Object>> getOrderDetails(
            @PathVariable String orderCode,
            @RequestHeader(value = "X-Guest-Cart-Token", required = false) String guestToken) {
        
        User user = getCurrentUser();
        OrderResponse order = orderService.getOrderDetails(orderCode, user, guestToken);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", order);
        
        return ResponseEntity.ok(response);
    }

    /** PayOS checkout page for a bank-transfer order; 503 when PayOS isn't configured (plain QR then). */
    @PostMapping("/{orderCode}/payos-link")
    public ResponseEntity<Map<String, Object>> payosLink(
            @PathVariable String orderCode,
            @RequestHeader(value = "X-Guest-Cart-Token", required = false) String guestToken) {
        var order = orderService.getOwnedOrder(orderCode, getCurrentUser(), guestToken);
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("data", Map.of("checkoutUrl", payOsService.createCheckoutUrl(order)));
        return ResponseEntity.ok(res);
    }

    /** Called by the order page on return from PayOS (and while waiting): pulls the PayOS status. */
    @PostMapping("/{orderCode}/payos-sync")
    public ResponseEntity<Map<String, Object>> payosSync(
            @PathVariable String orderCode,
            @RequestHeader(value = "X-Guest-Cart-Token", required = false) String guestToken) {
        var order = orderService.getOwnedOrder(orderCode, getCurrentUser(), guestToken);
        String payosStatus = payOsService.sync(order);
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("payosEnabled", payOsService.isEnabled());
        res.put("payosStatus", payosStatus);
        res.put("data", orderService.toResponse(order));
        return ResponseEntity.ok(res);
    }

    @PutMapping("/{orderCode}/payment")
    public ResponseEntity<Map<String, Object>> updatePayment(
            @PathVariable String orderCode,
            @RequestHeader(value = "X-Guest-Cart-Token", required = false) String guestToken,
            @RequestBody Map<String, String> body) {

        User user = getCurrentUser();
        OrderResponse response = orderService.updatePayment(orderCode, user, guestToken,
                body.get("paymentMethod"), body.get("customerName"), body.get("customerPhone"), body.get("shippingAddress"));

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", "Đã cập nhật thanh toán đơn hàng");
        res.put("data", response);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/{orderCode}/cancel")
    public ResponseEntity<Map<String, Object>> cancelOrder(
            @PathVariable String orderCode,
            @RequestHeader(value = "X-Guest-Cart-Token", required = false) String guestToken,
            @RequestBody(required = false) Map<String, String> body) {
        
        User user = getCurrentUser();
        String reason = body != null ? body.get("reason") : "Khách hàng hủy đơn hàng";
        OrderResponse response = orderService.cancelOrder(orderCode, user, guestToken, reason);
        
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", "Hủy đơn hàng thành công");
        res.put("data", response);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/{orderCode}/return-request")
    public ResponseEntity<Map<String, Object>> requestReturn(
            @PathVariable String orderCode,
            @RequestHeader(value = "X-Guest-Cart-Token", required = false) String guestToken,
            @RequestBody(required = false) Map<String, String> body) {

        User user = getCurrentUser();
        OrderResponse response = orderService.requestReturn(orderCode, user, guestToken,
                body != null ? body.get("reason") : null);

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", "Đã gửi yêu cầu trả hàng. Cửa hàng sẽ liên hệ với bạn để xử lý.");
        res.put("data", response);
        return ResponseEntity.ok(res);
    }
}
