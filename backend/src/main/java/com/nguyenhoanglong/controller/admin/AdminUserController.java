package com.nguyenhoanglong.controller.admin;

import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.service.UserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_USER)")
public class AdminUserController {

    private final UserService userService;
    private final com.nguyenhoanglong.service.DataAuditService dataAuditService;

    public AdminUserController(UserService userService, com.nguyenhoanglong.service.DataAuditService dataAuditService) {
        this.userService = userService;
        this.dataAuditService = dataAuditService;
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<Page<UserAdminDto>>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status) {
        
        Page<UserAdminDto> users = userService.getUsers(page, size, keyword, role, status);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách người dùng thành công", users));
    }

    /** Thong ke nhanh cho the tong quan dashboard (1 cau COUNT ... GROUP BY). */
    @GetMapping("/users/stats")
    public ResponseEntity<ApiResponse<java.util.Map<String, Long>>> getUserStats() {
        return ResponseEntity.ok(ApiResponse.success("Lấy thống kê người dùng thành công", userService.getUserStats()));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserAdminDto>> getUserById(@PathVariable String id) {
        UserAdminDto user = userService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin người dùng thành công", user));
    }

    @PostMapping("/users")
    public ResponseEntity<ApiResponse<UserAdminDto>> createUser(@Valid @RequestBody UserCreateDto createDto) {
        UserAdminDto created = userService.createUser(createDto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo người dùng mới thành công", created));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserAdminDto>> updateUser(
            @PathVariable String id,
            @Valid @RequestBody UserUpdateDto updateDto,
            Authentication authentication) {
        String currentAdminIdentifier = authentication != null ? authentication.getName() : "ADMIN";
        UserAdminDto before = userService.getUserById(id);
        boolean roleChanged = updateDto.getRoleCode() != null
                && !updateDto.getRoleCode().trim().equalsIgnoreCase(before.getRole());

        if (roleChanged && (currentAdminIdentifier.equalsIgnoreCase(before.getId())
                || currentAdminIdentifier.equalsIgnoreCase(before.getEmail()))) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Không thể tự thay đổi vai trò của chính mình");
        }

        UserAdminDto updated = userService.updateUser(id, updateDto);
        if (roleChanged) {
            dataAuditService.logAudit(currentAdminIdentifier, "CHANGE_USER_ROLE", "User", id,
                    "Đổi vai trò " + before.getRole() + " -> " + updated.getRole());
        } else {
            dataAuditService.logAudit(currentAdminIdentifier, "UPDATE_USER", "User", id,
                    "Cập nhật thông tin nhân viên " + updated.getEmail());
        }
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin người dùng thành công", updated));
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<ApiResponse<UserAdminDto>> updateUserStatus(
            @PathVariable String id,
            @Valid @RequestBody UserStatusUpdateDto statusDto,
            Authentication authentication) {
        
        String currentAdminIdentifier = authentication != null ? authentication.getName() : "ADMIN";
        UserAdminDto updated = userService.updateUserStatus(id, statusDto, currentAdminIdentifier);
        
        boolean isLocking = "LOCKED".equalsIgnoreCase(statusDto.getStatus());
        String msg = isLocking ? "Khóa tài khoản thành công" : "Mở khóa tài khoản thành công";
        
        dataAuditService.logAudit(currentAdminIdentifier, isLocking ? "LOCK_USER" : "UNLOCK_USER", "User", id, msg);
        
        return ResponseEntity.ok(ApiResponse.success(msg, updated));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable String id, Authentication authentication) {
        String currentAdminIdentifier = authentication != null ? authentication.getName() : "ADMIN";
        userService.deleteUser(id, currentAdminIdentifier);
        dataAuditService.logAudit(currentAdminIdentifier, "DELETE_USER", "User", id, "Xóa (khóa vĩnh viễn) tài khoản");
        return ResponseEntity.ok(ApiResponse.success("Xóa tài khoản thành công", null));
    }

    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<ApiResponse<ResetPasswordResponseDto>> resetUserPassword(@PathVariable String id) {
        ResetPasswordResponseDto response = userService.resetUserPassword(id);
        return ResponseEntity.ok(ApiResponse.success(response.getMessage(), response));
    }

}
