package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.*;
import org.springframework.data.domain.Page;

import java.util.List;

public interface UserService {

    Page<UserAdminDto> getUsers(int page, int size, String keyword, String role, String status);

    java.util.Map<String, Long> getUserStats();

    UserAdminDto getUserById(String id);

    UserAdminDto createUser(UserCreateDto createDto);

    UserAdminDto updateUser(String id, UserUpdateDto updateDto);

    UserAdminDto updateUserStatus(String targetUserId, UserStatusUpdateDto statusDto, String currentAdminIdOrEmail);

    ResetPasswordResponseDto resetUserPassword(String id);

    List<RoleWithPermissionsDto> getAllRolesWithPermissions();
}
