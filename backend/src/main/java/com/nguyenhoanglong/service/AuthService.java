package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.AuthDto;
import com.nguyenhoanglong.entity.EmailVerificationCode;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.EmailVerificationCodeRepository;
import com.nguyenhoanglong.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.security.SecureRandom;

import com.nguyenhoanglong.repository.PasswordResetTokenRepository;
import com.nguyenhoanglong.entity.PasswordResetToken;
import com.nguyenhoanglong.exception.ApiException;
import org.springframework.http.HttpStatus;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final EmailVerificationCodeRepository codeRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final WishlistService wishlistService;
    private final CartService cartService;

    public AuthService(UserRepository userRepository,
                       EmailVerificationCodeRepository codeRepository,
                       PasswordResetTokenRepository resetTokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       EmailService emailService,
                       WishlistService wishlistService,
                       CartService cartService) {
        this.userRepository = userRepository;
        this.codeRepository = codeRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.wishlistService = wishlistService;
        this.cartService = cartService;
    }

    @Transactional
    public String register(AuthDto.RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã được sử dụng");
        }

        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setEmailVerified(false);
        user.setStatus("PENDING_VERIFICATION");

        user = userRepository.save(user);

        generateAndSendOtp(user);

        // (Phase B) Email verification flow performs the cart merge when the user
        // becomes ACTIVE. We deliberately do NOT merge the guest cart during
        // register(): the guest account is not yet verified and the cart would
        // be attached to a user that cannot log in. The guest token is sent by
        // the frontend together with the verification request below.
        return "Đăng ký thành công, vui lòng kiểm tra email để xác thực.";
    }

    private void generateAndSendOtp(User user) {
        // Expire any active code
        Optional<EmailVerificationCode> activeCode = codeRepository.findByUserIdAndStatus(user.getId(), "ACTIVE");
        if (activeCode.isPresent()) {
            EmailVerificationCode old = activeCode.get();
            // Check cooldown
            if (old.getCreatedAt().plusSeconds(60).isAfter(LocalDateTime.now())) {
                throw new RuntimeException("Vui lòng đợi 60s trước khi yêu cầu gửi lại mã.");
            }
            old.setStatus("EXPIRED");
            codeRepository.save(old);
        }

        // Generate 6-digit OTP using SecureRandom (cryptographically strong)
        String otp = String.format("%06d", new SecureRandom().nextInt(999999));

        EmailVerificationCode newCode = new EmailVerificationCode();
        newCode.setUserId(user.getId());
        newCode.setEmail(user.getEmail());
        newCode.setCodeHash(passwordEncoder.encode(otp));
        newCode.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        newCode.setStatus("ACTIVE");
        newCode.setAttemptCount(0);
        newCode.setMaxAttempts(5);

        codeRepository.save(newCode);

        // Send email
        emailService.sendVerificationEmail(user.getEmail(), otp);
    }

    @Transactional
    public AuthDto.AuthResponse verifyEmail(AuthDto.VerifyEmailRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        if (user.isEmailVerified()) {
            throw new RuntimeException("Tài khoản đã được xác thực trước đó.");
        }

        EmailVerificationCode code = codeRepository.findByUserIdAndStatus(user.getId(), "ACTIVE")
                .orElseThrow(() -> new RuntimeException("Không có mã xác thực nào đang chờ xử lý hoặc mã đã hết hạn."));

        if (code.getExpiresAt().isBefore(LocalDateTime.now())) {
            code.setStatus("EXPIRED");
            codeRepository.save(code);
            throw new RuntimeException("Mã xác thực đã hết hạn.");
        }

        if (code.getAttemptCount() >= code.getMaxAttempts()) {
            code.setStatus("LOCKED");
            codeRepository.save(code);
            throw new RuntimeException("Mã xác thực đã bị khóa do nhập sai quá nhiều lần.");
        }

        if (!passwordEncoder.matches(request.getCode(), code.getCodeHash())) {
            code.setAttemptCount(code.getAttemptCount() + 1);
            if (code.getAttemptCount() >= code.getMaxAttempts()) {
                code.setStatus("LOCKED");
            }
            codeRepository.save(code);
            throw new RuntimeException("Mã xác thực không đúng.");
        }

        try {
            codeRepository.save(code);
            user.setEmailVerified(true);
            user.setStatus("ACTIVE");
            userRepository.save(user);
            userRepository.flush(); // Force flush to catch SQL exceptions here
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("DB_ERROR: " + e.getMessage() + " | CAUSE: " + (e.getCause() != null ? e.getCause().getMessage() : "null"));
        }

        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("role", user.getRole().name());
        String token = jwtService.generateToken(extraClaims, user.getEmail(), user.getId());

        java.util.List<String> cartWarnings = new java.util.ArrayList<>();
        if (request.getGuestToken() != null && !request.getGuestToken().isEmpty()) {
            wishlistService.mergeGuestWishlistToUser(request.getGuestToken(), user.getEmail());
            try {
                CartMergeResult merged = cartService.mergeGuestCartIntoUserCart(user.getEmail(), request.getGuestToken());
                cartWarnings.addAll(merged.getWarnings());
            } catch (RuntimeException ex) {
                cartWarnings.add("Không thể gộp giỏ hàng tạm: " + ex.getMessage());
            }
        }

        if (cartWarnings.isEmpty()) {
            return new AuthDto.AuthResponse(token, user.getId(), user.getFullName(), user.getEmail(), user.getStatus());
        }
        return new AuthDto.AuthResponse(token, user.getId(), user.getFullName(), user.getEmail(), user.getStatus(), cartWarnings);
    }

    @Transactional
    public void resendCode(AuthDto.ResendCodeRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        if (user.isEmailVerified()) {
            throw new RuntimeException("Tài khoản đã được xác thực trước đó.");
        }

        generateAndSendOtp(user);
    }

    public AuthDto.AuthResponse login(AuthDto.LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Email hoặc mật khẩu không đúng"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Email hoặc mật khẩu không đúng");
        }

        if (!user.isEmailVerified()) {
            throw new RuntimeException("UNVERIFIED");
        }

        if ("BANNED".equals(user.getStatus())) {
            throw new RuntimeException("Tài khoản đã bị khóa");
        }

        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("role", user.getRole().name());
        String token = jwtService.generateToken(extraClaims, user.getEmail(), user.getId());

        java.util.List<String> cartWarnings = new java.util.ArrayList<>();
        if (request.getGuestToken() != null && !request.getGuestToken().isEmpty()) {
            wishlistService.mergeGuestWishlistToUser(request.getGuestToken(), user.getEmail());
            try {
                CartMergeResult merged = cartService.mergeGuestCartIntoUserCart(user.getEmail(), request.getGuestToken());
                cartWarnings.addAll(merged.getWarnings());
            } catch (RuntimeException ex) {
                cartWarnings.add("Không thể gộp giỏ hàng tạm: " + ex.getMessage());
            }
        }

        if (cartWarnings.isEmpty()) {
            return new AuthDto.AuthResponse(token, user.getId(), user.getFullName(), user.getEmail(), user.getStatus());
        }
        return new AuthDto.AuthResponse(token, user.getId(), user.getFullName(), user.getEmail(), user.getStatus(), cartWarnings);
    }

    public AuthDto.AuthResponse me(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
        return new AuthDto.AuthResponse(null, user.getId(), user.getFullName(), user.getEmail(), user.getStatus());
    }

    @Transactional
    public String forgotPassword(String email) {
        Optional<User> optionalUser = userRepository.findByEmail(email);
        if (optionalUser.isEmpty()) {
            return "Nếu email tồn tại trong hệ thống, mã đặt lại mật khẩu đã được gửi.";
        }

        User user = optionalUser.get();

        // Check cooldown
        Optional<PasswordResetToken> lastTokenOpt = resetTokenRepository.findFirstByUserIdOrderByCreatedAtDesc(user.getId());
        if (lastTokenOpt.isPresent()) {
            PasswordResetToken lastToken = lastTokenOpt.get();
            if (lastToken.getCreatedAt().plusSeconds(60).isAfter(LocalDateTime.now())) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Vui lòng đợi 60 giây trước khi yêu cầu lại mã.");
            }
        }

        // Expire old ACTIVE tokens
        List<PasswordResetToken> activeTokens = resetTokenRepository.findAllByUserIdAndStatus(user.getId(), "ACTIVE");
        for (PasswordResetToken token : activeTokens) {
            token.setStatus("EXPIRED");
            resetTokenRepository.save(token);
        }

        // Generate OTP
        String otp = String.format("%06d", new java.security.SecureRandom().nextInt(999999));
        
        PasswordResetToken newToken = new PasswordResetToken();
        newToken.setUser(user);
        newToken.setOtpHash(passwordEncoder.encode(otp));
        newToken.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        newToken.setStatus("ACTIVE");
        newToken.setAttemptCount(0);
        newToken.setMaxAttempts(5);
        resetTokenRepository.save(newToken);

        emailService.sendPasswordResetEmail(user.getEmail(), otp);

        return "Nếu email tồn tại trong hệ thống, mã đặt lại mật khẩu đã được gửi.";
    }

    @Transactional
    public String resendPasswordResetCode(String email) {
        return forgotPassword(email);
    }

    @Transactional
    public String resetPassword(String email, String otp, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Email hoặc mã OTP không hợp lệ"));

        PasswordResetToken token = resetTokenRepository.findByUserIdAndStatus(user.getId(), "ACTIVE")
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Email hoặc mã OTP không hợp lệ"));

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            token.setStatus("EXPIRED");
            resetTokenRepository.save(token);
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP_EXPIRED");
        }

        if (token.getAttemptCount() >= token.getMaxAttempts()) {
            token.setStatus("LOCKED");
            token.setLockedAt(LocalDateTime.now());
            resetTokenRepository.save(token);
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mã OTP đã bị khóa do nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.");
        }

        if (!passwordEncoder.matches(otp, token.getOtpHash())) {
            token.setAttemptCount(token.getAttemptCount() + 1);
            if (token.getAttemptCount() >= token.getMaxAttempts()) {
                token.setStatus("LOCKED");
                token.setLockedAt(LocalDateTime.now());
            }
            resetTokenRepository.save(token);
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mã OTP không chính xác");
        }

        // Validated successfully
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mật khẩu mới không được trùng với mật khẩu cũ");
        }

        // Add password strength validation (example: min 8 length, has letter and number)
        if (newPassword.length() < 8 || !newPassword.matches(".*[a-zA-Z].*") || !newPassword.matches(".*[0-9].*")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mật khẩu phải từ 8 ký tự, bao gồm cả chữ và số");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        token.setStatus("USED");
        token.setUsedAt(LocalDateTime.now());
        resetTokenRepository.save(token);

        return "Đổi mật khẩu thành công";
    }
}
