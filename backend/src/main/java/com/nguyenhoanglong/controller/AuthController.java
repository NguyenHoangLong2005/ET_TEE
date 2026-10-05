package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.AuthDto;
import com.nguyenhoanglong.service.AuthService;
import com.nguyenhoanglong.service.BehaviorEventService;
import com.nguyenhoanglong.service.MarketingSubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import com.nguyenhoanglong.repository.UserRepository;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final BehaviorEventService behaviorEventService;
    private final MarketingSubscriptionService marketingSubscriptions;

    public AuthController(AuthService authService, UserRepository userRepository, BehaviorEventService behaviorEventService,
                          MarketingSubscriptionService marketingSubscriptions) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.behaviorEventService = behaviorEventService;
        this.marketingSubscriptions = marketingSubscriptions;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody AuthDto.RegisterRequest request) {
        try {
            String message = authService.register(request);
            if (Boolean.TRUE.equals(request.getMarketingOptIn())) {
                // consent ticked on the sign-up form; never fails the registration itself
                try {
                    String userId = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                            .or(() -> userRepository.findByEmail(request.getEmail())).map(u -> u.getId()).orElse(null);
                    marketingSubscriptions.subscribe(request.getEmail(), userId, MarketingSubscriptionService.SOURCE_REGISTER);
                } catch (RuntimeException ignored) {
                    // invalid email would already have failed registration
                }
            }
            Map<String, String> response = new HashMap<>();
            response.put("message", message);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@Valid @RequestBody AuthDto.VerifyEmailRequest request) {
        try {
            AuthDto.AuthResponse response = authService.verifyEmail(request);
            mergeGuestBehavior(request.getGuestToken(), response);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/resend-code")
    public ResponseEntity<?> resendCode(@Valid @RequestBody AuthDto.ResendCodeRequest request) {
        try {
            authService.resendCode(request);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Mã xác thực mới đã được gửi.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthDto.LoginRequest request, HttpServletRequest httpRequest) {
        try {
            String ipAddress = com.nguyenhoanglong.util.ClientIpResolver.resolve(httpRequest);
            AuthDto.AuthResponse response = authService.login(request, ipAddress);
            mergeGuestBehavior(request.getGuestToken(), response);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/check-email")
    public ResponseEntity<?> checkEmail(@RequestParam String email) {
        boolean exists = userRepository.existsByEmail(email);
        Map<String, Boolean> response = new HashMap<>();
        response.put("available", !exists);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            AuthDto.AuthResponse response = authService.me(email);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody AuthDto.ForgotPasswordRequest request) {
        try {
            String message = authService.forgotPassword(request.getEmail());
            Map<String, String> response = new HashMap<>();
            response.put("message", message);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/resend-password-reset-code")
    public ResponseEntity<?> resendPasswordResetCode(@Valid @RequestBody AuthDto.ForgotPasswordRequest request) {
        try {
            String message = authService.resendPasswordResetCode(request.getEmail());
            Map<String, String> response = new HashMap<>();
            response.put("message", message);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody AuthDto.ResetPasswordRequest request) {
        try {
            String message = authService.resetPassword(request.getEmail(), request.getOtp(), request.getNewPassword());
            Map<String, String> response = new HashMap<>();
            response.put("message", message);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /** Same moment AuthService merges the guest cart / wishlist: the browsing history follows too. */
    private void mergeGuestBehavior(String guestToken, AuthDto.AuthResponse response) {
        if (response != null && response.getToken() != null) {
            behaviorEventService.mergeGuestIntoUser(guestToken, response.getUserId());
        }
    }
}
