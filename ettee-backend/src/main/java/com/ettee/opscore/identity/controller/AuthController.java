package com.ettee.opscore.identity.controller;

import com.ettee.opscore.common.dto.ApiResponse;
import com.ettee.opscore.identity.dto.LoginRequest;
import com.ettee.opscore.identity.dto.LoginResponse;
import com.ettee.opscore.identity.dto.RefreshTokenRequest;
import com.ettee.opscore.identity.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request), "Đăng nhập thành công");
    }

    @PostMapping("/refresh")
    public ApiResponse<LoginResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ApiResponse.ok(authService.refresh(request.refreshToken()), "Đã làm mới access token");
    }
}
