package com.nguyenhoanglong.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class AuthDto {

    public static class RegisterRequest {
        @NotBlank(message = "Họ tên không được để trống")
        private String fullName;

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        private String email;

        private String phone;

        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 6, message = "Mật khẩu phải từ 6 ký tự trở lên")
        private String password;
        private String guestToken;
        public String getGuestToken() { return guestToken; }
        public void setGuestToken(String guestToken) { this.guestToken = guestToken; }

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class LoginRequest {
        @NotBlank(message = "Email không được để trống")
        private String email;

        @NotBlank(message = "Mật khẩu không được để trống")
        private String password;
        
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        
        private String guestToken;
        public String getGuestToken() { return guestToken; }
        public void setGuestToken(String guestToken) { this.guestToken = guestToken; }
    }

    public static class VerifyEmailRequest {
        @NotBlank(message = "Email không được để trống")
        private String email;

        @NotBlank(message = "Mã xác thực không được để trống")
        @Size(min = 6, max = 6, message = "Mã xác thực phải gồm 6 chữ số")
        private String code;
        
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }

        private String guestToken;
        public String getGuestToken() { return guestToken; }
        public void setGuestToken(String guestToken) { this.guestToken = guestToken; }
    }

    public static class ForgotPasswordRequest {
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        private String email;
        
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }

    public static class ResetPasswordRequest {
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        private String email;

        @NotBlank(message = "Mã OTP không được để trống")
        @Size(min = 6, max = 6, message = "Mã OTP phải gồm 6 chữ số")
        private String otp;

        @NotBlank(message = "Mật khẩu mới không được để trống")
        @Size(min = 8, message = "Mật khẩu mới phải từ 8 ký tự trở lên")
        private String newPassword;
        
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getOtp() { return otp; }
        public void setOtp(String otp) { this.otp = otp; }
        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
    }

    public static class ResendCodeRequest {
        @NotBlank(message = "Email không được để trống")
        private String email;
        
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }

    public static class AuthResponse {
        private String token;
        private String userId;
        private String fullName;
        private String email;
        private String status;
        private java.util.List<String> cartWarnings;

        public AuthResponse(String token, String userId, String fullName, String email, String status) {
            this.token = token;
            this.userId = userId;
            this.fullName = fullName;
            this.email = email;
            this.status = status;
        }

        public AuthResponse(String token, String userId, String fullName, String email, String status, java.util.List<String> cartWarnings) {
            this.token = token;
            this.userId = userId;
            this.fullName = fullName;
            this.email = email;
            this.status = status;
            this.cartWarnings = cartWarnings;
        }
        
        public String getToken() { return token; }
        public String getUserId() { return userId; }
        public String getFullName() { return fullName; }
        public String getEmail() { return email; }
        public String getStatus() { return status; }
        public java.util.List<String> getCartWarnings() { return cartWarnings; }
        public void setCartWarnings(java.util.List<String> cartWarnings) { this.cartWarnings = cartWarnings; }
    }
}
