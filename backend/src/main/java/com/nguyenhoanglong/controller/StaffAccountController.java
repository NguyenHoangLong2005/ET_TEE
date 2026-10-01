package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.ChangePasswordRequest;
import com.nguyenhoanglong.entity.Role;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.UserRepository;
import com.nguyenhoanglong.service.AccountService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Profile and password of the person signed in to the admin / staff / store-owner area.
 *
 * Deliberately separate from the customer endpoints (/api/account/**): staff have no shipping
 * address, body measurements or fit preferences, and must not be able to edit their e-mail or
 * role. Writes here are picked up by the audit trail (/api/staff/** is audited).
 */
@RestController
@RequestMapping("/api/staff/me")
public class StaffAccountController {

    private final UserRepository userRepository;
    private final AccountService accountService;

    public StaffAccountController(UserRepository userRepository, AccountService accountService) {
        this.userRepository = userRepository;
        this.accountService = accountService;
    }

    /** Only staff-type accounts may use this controller; customers have their own account pages. */
    private User requireStaff() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập");
        }
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không tìm thấy tài khoản"));
        if (user.getRole() == null || user.getRole() == Role.USER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản khách hàng không dùng trang này");
        }
        return user;
    }

    private Map<String, Object> profileOf(User user) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", user.getId());
        data.put("fullName", user.getFullName());
        data.put("email", user.getEmail());
        data.put("phone", user.getPhone());
        data.put("role", user.getRole() != null ? user.getRole().name() : null);
        data.put("shopId", user.getShopId());
        data.put("status", user.getStatus());
        data.put("createdAt", user.getCreatedAt());
        return data;
    }

    private static Map<String, Object> ok(Object data, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", true);
        if (message != null) body.put("message", message);
        if (data != null) body.put("data", data);
        return body;
    }

    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile() {
        return ResponseEntity.ok(ok(profileOf(requireStaff()), null));
    }

    public static class UpdateStaffProfileRequest {
        @NotBlank(message = "Họ tên không được để trống")
        @Size(min = 2, max = 100, message = "Họ tên từ 2 đến 100 ký tự")
        private String fullName;

        @Pattern(regexp = "^$|^[0-9+\\s\\-]{8,15}$", message = "Số điện thoại không hợp lệ (8-15 chữ số)")
        private String phone;

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
    }

    /** Only name and phone are editable; e-mail, role and branch are managed by an administrator. */
    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(@Valid @RequestBody UpdateStaffProfileRequest request) {
        User user = requireStaff();
        user.setFullName(request.getFullName().trim());
        String phone = request.getPhone() == null ? "" : request.getPhone().trim();
        user.setPhone(phone.isEmpty() ? null : phone);
        userRepository.save(user);
        return ResponseEntity.ok(ok(profileOf(user), "Đã cập nhật hồ sơ"));
    }

    @PutMapping("/password")
    public ResponseEntity<Map<String, Object>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        User user = requireStaff();
        if (request.getNewPassword() != null && request.getNewPassword().equals(request.getCurrentPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu mới phải khác mật khẩu hiện tại.");
        }
        accountService.changePassword(user, request); // verifies the current password and the strength rules
        return ResponseEntity.ok(ok(null, "Đổi mật khẩu thành công"));
    }
}
