package com.nguyenhoanglong.controller.admin;

import com.nguyenhoanglong.dto.ApiResponse;
import com.nguyenhoanglong.dto.CskhQuotaStatusDto;
import com.nguyenhoanglong.dto.UpdateCskhQuotaDto;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.UserRepository;
import com.nguyenhoanglong.service.CskhExtendedService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/cskh")
@PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_USER)")
public class AdminCskhQuotaController {

    private final CskhExtendedService cskhExtendedService;
    private final UserRepository userRepository;

    public AdminCskhQuotaController(CskhExtendedService cskhExtendedService, UserRepository userRepository) {
        this.cskhExtendedService = cskhExtendedService;
        this.userRepository = userRepository;
    }

    private User getCurrentAdmin() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        }
        String name = auth.getName();
        return userRepository.findByEmail(name)
                .orElseGet(() -> userRepository.findById(name)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không tìm thấy người dùng")));
    }

    @PutMapping("/quota/{staffId}")
    public ResponseEntity<ApiResponse<CskhQuotaStatusDto>> updateStaffQuota(
            @PathVariable String staffId,
            @Valid @RequestBody UpdateCskhQuotaDto dto) {
        User admin = getCurrentAdmin();
        CskhQuotaStatusDto result = cskhExtendedService.updateStaffQuota(admin, staffId, dto);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật hạn mức voucher tri ân thành công", result));
    }
}

