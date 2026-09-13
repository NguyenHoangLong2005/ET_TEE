package com.ettee.opscore.admin.service;

import com.ettee.opscore.admin.dto.CreateStaffUserRequest;
import com.ettee.opscore.admin.dto.UserSummaryDto;
import com.ettee.opscore.common.dto.PageResponse;
import com.ettee.opscore.common.exception.AppExceptions;
import com.ettee.opscore.identity.entity.*;
import com.ettee.opscore.identity.repository.RoleRepository;
import com.ettee.opscore.identity.repository.StaffProfileRepository;
import com.ettee.opscore.identity.repository.UserRepository;
import com.ettee.opscore.identity.repository.UserRoleRepository;
import com.ettee.opscore.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserAdminService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final StaffProfileRepository staffProfileRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public PageResponse<UserSummaryDto> search(String keyword, Boolean isStaff, Pageable pageable) {
        var page = userRepository.search(keyword, isStaff, pageable);
        return PageResponse.from(page.map(this::toSummary));
    }

    @Transactional(readOnly = true)
    public UserSummaryDto getById(UUID id) {
        AppUser user = userRepository.findById(id)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Người dùng", id));
        return toSummary(user);
    }

    private UserSummaryDto toSummary(AppUser user) {
        List<String> roleCodes = userRoleRepository.findRoleCodesByUserId(user.getId());
        return new UserSummaryDto(user.getId(), user.getFullName(), user.getEmail(), user.getPhone(),
                user.getStatus(), user.isStaff(), roleCodes, user.getCreatedAt(), user.getLastLoginAt());
    }

    /**
     * Tạo tài khoản nhân viên nội bộ (dùng cho mọi role staff: admin, shop_owner, cskh_staff, ...).
     * Trigger DB sẽ tự cập nhật users.is_staff dựa trên role vừa gán ở đây.
     */
    @Transactional
    public UserSummaryDto createStaffUser(CreateStaffUserRequest request, JwtPrincipal actor) {
        if (request.email() == null && request.phone() == null) {
            throw new AppExceptions.BusinessRuleViolationException("Phải có email hoặc số điện thoại");
        }

        AppUser user = new AppUser();
        user.setFullName(request.fullName());
        user.setEmail(request.email());
        user.setPhone(request.phone());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setStatus(AccountStatus.active);
        user = userRepository.save(user);

        StaffProfile profile = new StaffProfile();
        profile.setUserId(user.getId());
        profile.setEmployeeCode(request.employeeCode());
        profile.setDepartment(request.department());
        profile.setActive(true);
        staffProfileRepository.save(profile);

        for (String roleCode : request.roleCodes()) {
            Role role = roleRepository.findByCode(roleCode)
                    .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Role", roleCode));
            userRoleRepository.save(UserRole.of(user.getId(), role.getId(), actor.userId()));
        }

        return toSummary(userRepository.findById(user.getId()).orElseThrow());
    }

    @Transactional
    public void lockUser(UUID targetId, String reason, JwtPrincipal actor) {
        if (targetId.equals(actor.userId())) {
            throw new AppExceptions.BusinessRuleViolationException("Không thể tự khóa tài khoản của chính mình");
        }
        AppUser user = userRepository.findById(targetId)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Người dùng", targetId));
        user.setStatus(AccountStatus.locked);
        user.setLockedReason(reason);
        user.setLockedBy(actor.userId());
        userRepository.save(user);
    }

    @Transactional
    public void unlockUser(UUID targetId) {
        AppUser user = userRepository.findById(targetId)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Người dùng", targetId));
        user.setStatus(AccountStatus.active);
        user.setLockedReason(null);
        user.setLockedBy(null);
        userRepository.save(user);
    }

    @Transactional
    public void assignRole(UUID targetId, String roleCode, JwtPrincipal actor) {
        AppUser user = userRepository.findById(targetId)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Người dùng", targetId));
        Role role = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Role", roleCode));

        boolean already = userRoleRepository.findAllByUserId(user.getId()).stream()
                .anyMatch(ur -> ur.getId().getRoleId().equals(role.getId()));
        if (already) {
            throw new AppExceptions.BusinessRuleViolationException("Người dùng đã có role này");
        }
        userRoleRepository.save(UserRole.of(user.getId(), role.getId(), actor.userId()));
    }

    @Transactional
    public void revokeRole(UUID targetId, String roleCode, JwtPrincipal actor) {
        if (targetId.equals(actor.userId())) {
            throw new AppExceptions.BusinessRuleViolationException("Không thể tự gỡ role của chính mình");
        }
        Role role = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Role", roleCode));
        userRoleRepository.deleteByIdUserIdAndIdRoleId(targetId, role.getId());
    }
}
