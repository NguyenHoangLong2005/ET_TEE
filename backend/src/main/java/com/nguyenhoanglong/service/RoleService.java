package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.RoleEntity;
import com.nguyenhoanglong.repository.RoleRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class RoleService {
    private final RoleRepository roleRepository;

    // roles is a fixed Java enum (com.nguyenhoanglong.entity.Role) that
    // User.role is typed against. RoleEntity is a separate, unconnected
    // metadata table: creating a new row here could never actually be
    // assigned to any user (the enum has no such value), and deleting one
    // of the 8 rows below silently breaks the RBAC screen for a role real
    // users still hold. Both actions previously succeeded and looked like
    // they worked, so this service now refuses them outright.
    private static final Set<String> SYSTEM_ROLE_CODES = Stream.of(com.nguyenhoanglong.entity.Role.values())
            .map(Enum::name)
            .collect(Collectors.toSet());

    public RoleService(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    public List<RoleEntity> getAllRoles() {
        return roleRepository.findAll();
    }

    public Optional<RoleEntity> getRoleByCode(String code) {
        return roleRepository.findById(code);
    }

    @Transactional
    public RoleEntity createRole(RoleEntity role) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Không thể tạo vai trò mới: hệ thống chỉ hỗ trợ " + SYSTEM_ROLE_CODES.size() +
                        " vai trò cố định. Vai trò mới không thể gán cho bất kỳ tài khoản nào.");
    }

    @Transactional
    public void deleteRole(String code) {
        if (code != null && SYSTEM_ROLE_CODES.contains(code.toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Không thể xóa vai trò hệ thống \"" + code + "\": vẫn có thể có tài khoản đang giữ vai trò này.");
        }
        roleRepository.deleteById(code);
    }
}
