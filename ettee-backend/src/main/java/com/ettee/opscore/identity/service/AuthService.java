package com.ettee.opscore.identity.service;

import com.ettee.opscore.common.exception.AppExceptions;
import com.ettee.opscore.identity.dto.LoginRequest;
import com.ettee.opscore.identity.dto.LoginResponse;
import com.ettee.opscore.identity.entity.AppUser;
import com.ettee.opscore.identity.repository.UserRepository;
import com.ettee.opscore.identity.repository.UserRoleRepository;
import com.ettee.opscore.security.JwtService;
import com.ettee.opscore.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        try {
            var authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.usernameOrPhone(), request.password())
            );
            SecurityUser principal = (SecurityUser) authentication.getPrincipal();

            AppUser user = userRepository.findById(principal.getUserId())
                    .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Người dùng", principal.getUserId()));
            user.setLastLoginAt(Instant.now());
            userRepository.save(user);

            String accessToken = jwtService.generateAccessToken(principal);
            String refreshToken = jwtService.generateRefreshToken(user.getId());
            return LoginResponse.of(accessToken, refreshToken, user.getId(), user.getFullName(),
                    principal.getRoleCodes(), principal.getPermissionCodes());
        } catch (org.springframework.security.core.AuthenticationException ex) {
            throw new AppExceptions.AuthenticationFailedException("Sai tài khoản hoặc mật khẩu");
        }
    }

    /**
     * Cấp access token mới từ refresh token còn hạn. Nạp LẠI role/permission mới nhất từ DB
     * (không tin theo access token cũ) — để nếu Admin vừa đổi/gỡ quyền của người dùng này trong
     * lúc access token cũ còn hạn, access token MỚI sau refresh sẽ phản ánh đúng quyền hiện tại.
     * Tài khoản bị khóa (status != active) sẽ bị chặn refresh ngay, dù refresh token còn hạn.
     */
    @Transactional(readOnly = true)
    public LoginResponse refresh(String refreshToken) {
        if (!jwtService.isValidRefreshToken(refreshToken)) {
            throw new AppExceptions.AuthenticationFailedException("Refresh token không hợp lệ hoặc đã hết hạn");
        }
        UUID userId = jwtService.extractUserId(refreshToken);
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Người dùng", userId));

        if (user.getStatus() != com.ettee.opscore.identity.entity.AccountStatus.active) {
            throw new AppExceptions.AuthenticationFailedException("Tài khoản không còn ở trạng thái hoạt động");
        }

        var roleCodes = userRoleRepository.findRoleCodesByUserId(user.getId());
        var permissionCodes = userRoleRepository.findPermissionCodesByUserId(user.getId());
        SecurityUser principal = new SecurityUser(user, roleCodes, permissionCodes);

        String newAccessToken = jwtService.generateAccessToken(principal);
        String newRefreshToken = jwtService.generateRefreshToken(user.getId());
        return LoginResponse.of(newAccessToken, newRefreshToken, user.getId(), user.getFullName(), roleCodes, permissionCodes);
    }
}
