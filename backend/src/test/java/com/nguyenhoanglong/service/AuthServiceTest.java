package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.AuthDto;
import com.nguyenhoanglong.entity.Role;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.exception.ApiException;
import com.nguyenhoanglong.repository.EmailVerificationCodeRepository;
import com.nguyenhoanglong.repository.PasswordResetTokenRepository;
import com.nguyenhoanglong.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private EmailVerificationCodeRepository codeRepository;
    @Mock private PasswordResetTokenRepository resetTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private EmailService emailService;
    @Mock private WishlistService wishlistService;
    @Mock private CartService cartService;

    @InjectMocks private AuthService authService;

    private User activeUser;

    @BeforeEach
    void setUp() throws Exception {
        activeUser = new User();
        activeUser.setId("user-1");
        activeUser.setEmail("user@example.com");
        activeUser.setFullName("Test User");
        activeUser.setPhone("0900000000");
        activeUser.setPasswordHash("HASH");
        activeUser.setEmailVerified(true);
        activeUser.setStatus("ACTIVE");
        activeUser.setRole(Role.USER);

        // AuthService#jwtExpiration is read via @Value; the field doesn't exist
        // in JwtService — here we only care about behaviour, not JWT decoding.
    }

    @Test
    void loginSuccess_returnsTokenAndCallsCartMergeWhenGuestTokenPresent() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("password", "HASH")).thenReturn(true);
        when(jwtService.generateToken(any(Map.class), eq("user@example.com"), eq("user-1")))
                .thenReturn("jwt-token");

        AuthDto.LoginRequest req = new AuthDto.LoginRequest();
        req.setEmail("user@example.com");
        req.setPassword("password");
        req.setGuestToken("guest-xyz");

        when(cartService.mergeGuestCartIntoUserCart("user@example.com", "guest-xyz"))
                .thenReturn(CartMergeResult.empty());

        AuthDto.AuthResponse res = authService.login(req);

        assertThat(res.getToken()).isEqualTo("jwt-token");
        assertThat(res.getEmail()).isEqualTo("user@example.com");
        assertThat(res.getCartWarnings()).isNullOrEmpty();

        verify(wishlistService).mergeGuestWishlistToUser("guest-xyz", "user@example.com");
        verify(cartService).mergeGuestCartIntoUserCart("user@example.com", "guest-xyz");
    }

    @Test
    void loginSuccess_noGuestToken_doesNotCallCartMerge() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("password", "HASH")).thenReturn(true);
        when(jwtService.generateToken(any(Map.class), anyString(), anyString())).thenReturn("jwt-token");

        AuthDto.LoginRequest req = new AuthDto.LoginRequest();
        req.setEmail("user@example.com");
        req.setPassword("password");
        // no guest token

        AuthDto.AuthResponse res = authService.login(req);

        assertThat(res.getToken()).isEqualTo("jwt-token");
        verify(wishlistService, never()).mergeGuestWishlistToUser(any(), any());
        verify(cartService, never()).mergeGuestCartIntoUserCart(any(), any());
    }

    @Test
    void loginSuccess_cartMergeFails_returnsWarningButStillReturnsToken() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("password", "HASH")).thenReturn(true);
        when(jwtService.generateToken(any(Map.class), anyString(), anyString())).thenReturn("jwt-token");
        when(cartService.mergeGuestCartIntoUserCart(any(), any()))
                .thenThrow(new RuntimeException("DB unavailable"));

        AuthDto.LoginRequest req = new AuthDto.LoginRequest();
        req.setEmail("user@example.com");
        req.setPassword("password");
        req.setGuestToken("guest-xyz");

        AuthDto.AuthResponse res = authService.login(req);

        // Login must still succeed even if the merge failed
        assertThat(res.getToken()).isEqualTo("jwt-token");
        assertThat(res.getCartWarnings()).isNotEmpty();
        assertThat(res.getCartWarnings().get(0)).contains("Không thể gộp giỏ hàng tạm");
    }

    @Test
    void loginSuccess_cartMergeHasWarnings_returnsThemInPayload() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("password", "HASH")).thenReturn(true);
        when(jwtService.generateToken(any(Map.class), anyString(), anyString())).thenReturn("jwt-token");
        when(cartService.mergeGuestCartIntoUserCart(any(), any()))
                .thenReturn(new CartMergeResult(java.util.List.of("stock warning 1", "stock warning 2"), 3, 3));

        AuthDto.LoginRequest req = new AuthDto.LoginRequest();
        req.setEmail("user@example.com");
        req.setPassword("password");
        req.setGuestToken("guest-xyz");

        AuthDto.AuthResponse res = authService.login(req);

        assertThat(res.getToken()).isEqualTo("jwt-token");
        assertThat(res.getCartWarnings()).containsExactly("stock warning 1", "stock warning 2");
    }

    @Test
    void loginWrongPassword_throwsWithoutCallingJwt() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("wrong", "HASH")).thenReturn(false);

        AuthDto.LoginRequest req = new AuthDto.LoginRequest();
        req.setEmail("user@example.com");
        req.setPassword("wrong");

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("không đúng");
        verify(jwtService, never()).generateToken(any(Map.class), anyString(), anyString());
    }

    @Test
    void loginUnverifiedUser_throwsUnverifedAndDoesNotCallJwt() {
        User unverified = new User();
        unverified.setEmail("u@example.com");
        unverified.setPasswordHash("HASH");
        unverified.setEmailVerified(false);
        unverified.setStatus("PENDING_VERIFICATION");

        when(userRepository.findByEmail("u@example.com")).thenReturn(Optional.of(unverified));
        when(passwordEncoder.matches("password", "HASH")).thenReturn(true);

        AuthDto.LoginRequest req = new AuthDto.LoginRequest();
        req.setEmail("u@example.com");
        req.setPassword("password");

        assertThatThrownBy(() -> authService.login(req)).isInstanceOf(RuntimeException.class)
                .hasMessage("UNVERIFIED");
        verify(jwtService, never()).generateToken(any(Map.class), anyString(), anyString());
    }

    @Test
    void loginBannedUser_throws() {
        activeUser.setStatus("BANNED");

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("password", "HASH")).thenReturn(true);

        AuthDto.LoginRequest req = new AuthDto.LoginRequest();
        req.setEmail("user@example.com");
        req.setPassword("password");

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("bị khóa");
    }

    @Test
    void roleClaim_isPresentInJwtPayload() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("password", "HASH")).thenReturn(true);

        // Capture the extraClaims map passed to JwtService
        @SuppressWarnings({"unchecked", "rawtypes"})
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass((Class) Map.class);
        when(jwtService.generateToken(captor.capture(), anyString(), anyString())).thenReturn("jwt-token");

        AuthDto.LoginRequest req = new AuthDto.LoginRequest();
        req.setEmail("user@example.com");
        req.setPassword("password");

        authService.login(req);

        Map<String, Object> claims = captor.getValue();
        assertThat(claims).containsEntry("role", "USER");
    }

    @Test
    void registerDoesNotMergeCart_immediately() {
        when(userRepository.existsByEmail("user@example.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId("user-1");
            return u;
        });
        when(codeRepository.findByUserIdAndStatus(anyString(), eq("ACTIVE"))).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("HASH");

        AuthDto.RegisterRequest req = new AuthDto.RegisterRequest();
        req.setEmail("user@example.com");
        req.setFullName("Test User");
        req.setPassword("password");
        req.setGuestToken("guest-xyz");

        String msg = authService.register(req);

        assertThat(msg).contains("Đăng ký thành công");
        // Register must NOT trigger cart merge — that happens on verifyEmail.
        verify(cartService, never()).mergeGuestCartIntoUserCart(any(), any());
        verify(wishlistService, never()).mergeGuestWishlistToUser(any(), any());
    }

    @Test
    void resetPassword_tooShort_throws() {
        when(userRepository.findByEmail("u@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.resetPassword("u@example.com", "123456", "short"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Email hoặc mã OTP không hợp lệ");
    }
}
