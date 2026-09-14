package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.UserRepository;
import com.nguyenhoanglong.service.AccountService;
import com.nguyenhoanglong.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;
    private final ReviewService reviewService;
    private final UserRepository userRepository;

    public AccountController(AccountService accountService, ReviewService reviewService, UserRepository userRepository) {
        this.accountService = accountService;
        this.reviewService = reviewService;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
            return userRepository.findByEmail(auth.getName()).orElse(null);
        }
        return null;
    }

    private User requireUser() {
        User user = getCurrentUser();
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập");
        }
        return user;
    }

    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile() {
        User user = requireUser();
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", accountService.getProfile(user));
        return ResponseEntity.ok(response);
    }

    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(@Valid @RequestBody ProfileRequest request) {
        User user = requireUser();
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", accountService.updateProfile(user, request));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/measurements")
    public ResponseEntity<Map<String, Object>> getMeasurements() {
        User user = requireUser();
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", accountService.getMeasurements(user));
        return ResponseEntity.ok(response);
    }

    @PutMapping("/measurements")
    public ResponseEntity<Map<String, Object>> updateMeasurements(@Valid @RequestBody MeasurementRequest request) {
        User user = requireUser();
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", accountService.updateMeasurements(user, request));
        return ResponseEntity.ok(response);
    }

    @PutMapping("/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        User user = requireUser();
        accountService.changePassword(user, request);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Đổi mật khẩu thành công");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/reviews")
    public ResponseEntity<Map<String, Object>> getMyReviews() {
        User user = requireUser();
        // Return all reviews belonging to the user
        List<ReviewResponse> reviews = reviewService.getUserReviews(user.getId());
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", reviews);
        return ResponseEntity.ok(response);
    }
}
