package com.nguyenhoanglong.controller.admin;

import com.nguyenhoanglong.dto.ApiResponse;
import com.nguyenhoanglong.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserRepository userRepository;

    public AdminUserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSystemUsersOverview() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("totalUsers", userRepository.count());
        data.put("rolesSupported", List.of("SYSTEM_ADMIN", "STORE_STAFF", "CUSTOMER"));
        data.put("auditStatus", "RBAC Policy Active");
        return ResponseEntity.ok(ApiResponse.success("System Admin: User roles overview fetched", data));
    }
}
