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
    private UserRepository userRepository;

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
            @RequestBody CheckoutRequest request) {
        
        User user = getCurrentUser();
        OrderResponse orderResponse = orderService.checkout(user, guestToken, request);
        
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
}
