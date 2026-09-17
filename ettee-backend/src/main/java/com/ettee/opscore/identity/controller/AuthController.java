package com.ettee.opscore.identity.controller;

import com.ettee.opscore.common.dto.ApiResponse;
import com.ettee.opscore.common.exception.AppExceptions;
import com.ettee.opscore.identity.dto.LoginRequest;
import com.ettee.opscore.identity.dto.LoginResponse;
import com.ettee.opscore.identity.dto.RefreshTokenRequest;
import com.ettee.opscore.identity.dto.RegisterRequest;
import com.ettee.opscore.identity.dto.UserProfileResponse;
import com.ettee.opscore.identity.entity.AppUser;
import com.ettee.opscore.identity.repository.UserRepository;
import com.ettee.opscore.identity.repository.UserRoleRepository;
import com.ettee.opscore.identity.service.AuthService;
import com.ettee.opscore.identity.service.CustomerRegisterService;
import com.ettee.opscore.security.JwtPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final CustomerRegisterService customerRegisterService;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request), "Đăng nhập thành công");
    }

    @PostMapping("/register")
    public ApiResponse<Void> register(@Valid @RequestBody RegisterRequest request) {
        customerRegisterService.registerCustomer(request);
        return ApiResponse.message("Đăng ký thành công");
    }

    @PostMapping("/refresh")
    public ApiResponse<LoginResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ApiResponse.ok(authService.refresh(request.refreshToken()), "Đã làm mới access token");
    }

    @GetMapping("/me")
    public ApiResponse<UserProfileResponse> me(@AuthenticationPrincipal JwtPrincipal principal) {
        if (principal == null) {
            throw new AppExceptions.AuthenticationFailedException("Vui lòng đăng nhập");
        }

        AppUser user = userRepository.findById(principal.userId())
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Người dùng", principal.userId()));

        var roles = userRoleRepository.findRoleCodesByUserId(user.getId());
        var permissions = userRoleRepository.findPermissionCodesByUserId(user.getId());

        return ApiResponse.ok(
                new UserProfileResponse(user.getId(), user.getFullName(), user.getEmail(), user.getPhone(),
                        user.getStatus(), roles, permissions),
                "Lấy thông tin người dùng thành công");
    }
}
