package com.nguyenhoanglong.service.impl;

import com.nguyenhoanglong.constant.PermissionConstants;
import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.RoleRepository;
import com.nguyenhoanglong.repository.UserRepository;
import com.nguyenhoanglong.service.RolePermissionService;
import com.nguyenhoanglong.service.UserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RolePermissionService rolePermissionService;
    private final PasswordEncoder passwordEncoder;

    // Roles tied to a specific shop branch
    private static final Set<Role> SHOP_BOUND_ROLES = Set.of(
            Role.SHOP_OWNER,
            Role.SALES_STAFF,
            Role.CSKH_STAFF,
            Role.WAREHOUSE_STAFF,
            Role.SHIPPING_STAFF,
            Role.STAFF
    );

    public UserServiceImpl(UserRepository userRepository,
                           RoleRepository roleRepository,
                           RolePermissionService rolePermissionService,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.rolePermissionService = rolePermissionService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public Page<UserAdminDto> getUsers(int page, int size, String keyword, String roleStr, String status) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        Role roleEnum = null;
        if (roleStr != null && !roleStr.trim().isEmpty()) {
            try {
                roleEnum = Role.valueOf(roleStr.trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                // Ignore invalid role filter or treat as null
            }
        }

        String searchKeyword = (keyword != null && !keyword.trim().isEmpty()) ? "%" + keyword.trim().toLowerCase() + "%" : null;
        String statusFilter = (status != null && !status.trim().isEmpty()) ? status.trim().toUpperCase() : null;

        Page<User> usersPage = userRepository.searchUsers(searchKeyword, roleEnum, statusFilter, pageable);
        return usersPage.map(this::mapToUserAdminDto);
    }

    @Override
    public Map<String, Long> getUserStats() {
        long total = 0, active = 0, locked = 0;
        for (Object[] row : userRepository.countGroupedByStatus()) {
            String status = row[0] != null ? row[0].toString() : "ACTIVE";
            long cnt = ((Number) row[1]).longValue();
            total += cnt;
            if ("ACTIVE".equals(status)) active += cnt;
            if ("LOCKED".equals(status) || "BANNED".equals(status)) locked += cnt;
        }
        Map<String, Long> stats = new LinkedHashMap<>();
        stats.put("total", total);
        stats.put("active", active);
        stats.put("locked", locked);
        return stats;
    }

    @Override
    public UserAdminDto getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng với ID: " + id));
        return mapToUserAdminDto(user);
    }

    @Override
    @Transactional
    public UserAdminDto createUser(UserCreateDto createDto) {
        // Validate Employee Code
        String empCode = createDto.getEmployeeCode();
        if (empCode != null && !empCode.trim().isEmpty()) {
            empCode = empCode.trim();
            if (userRepository.existsByEmployeeCode(empCode)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Mã nhân viên đã tồn tại: " + empCode);
            }
        } else {
            do {
                empCode = "EMP-" + (10000 + new Random().nextInt(90000));
            } while (userRepository.existsByEmployeeCode(empCode));
        }

        // Validate Email
        String email = createDto.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã tồn tại trong hệ thống: " + email);
        }

        // Validate Role
        Role role;
        try {
            role = Role.valueOf(createDto.getRoleCode().trim().toUpperCase());
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã vai trò (roleCode) không hợp lệ: " + createDto.getRoleCode());
        }

        // Validate Role-ShopId Consistency
        Long shopId = validateAndResolveShopId(role, createDto.getShopId());

        // Password. Leaving it blank used to give every such account the same well-known
        // password; generate a random one instead and return it once.
        boolean generated = createDto.getInitialPassword() == null || createDto.getInitialPassword().trim().isEmpty();
        String rawPassword = generated ? generateRandomPassword() : createDto.getInitialPassword();

        User newUser = User.builder()
                .employeeCode(empCode)
                .fullName(createDto.getFullName().trim())
                .email(email)
                .phone(createDto.getPhone() != null ? createDto.getPhone().trim() : null)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .role(role)
                .shopId(shopId)
                .status("ACTIVE")
                .emailVerified(true)
                .mustChangePassword(true)
                .failedLoginAttempts(0)
                .build();

        User saved = userRepository.save(newUser);
        UserAdminDto dto = mapToUserAdminDto(saved);
        if (generated) dto.setTemporaryPassword(rawPassword);
        return dto;
    }

    @Override
    @Transactional
    public UserAdminDto updateUser(String id, UserUpdateDto updateDto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng với ID: " + id));

        // Validate Employee Code if changed
        if (updateDto.getEmployeeCode() != null && !updateDto.getEmployeeCode().trim().isEmpty()) {
            String newEmpCode = updateDto.getEmployeeCode().trim();
            if (userRepository.existsByEmployeeCodeAndIdNot(newEmpCode, id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Mã nhân viên đã tồn tại: " + newEmpCode);
            }
            user.setEmployeeCode(newEmpCode);
        }

        // Validate Role
        Role newRole;
        try {
            newRole = Role.valueOf(updateDto.getRoleCode().trim().toUpperCase());
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã vai trò (roleCode) không hợp lệ: " + updateDto.getRoleCode());
        }

        // Rule 5 Expansion: Check if changing role away from ADMIN when user is the last active ADMIN
        if (user.getRole() == Role.ADMIN && newRole != Role.ADMIN && "ACTIVE".equalsIgnoreCase(user.getStatus())) {
            long activeAdminCount = userRepository.countByRoleAndStatus(Role.ADMIN, "ACTIVE");
            if (activeAdminCount <= 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể thay đổi vai trò của Admin duy nhất còn hoạt động trong hệ thống");
            }
        }

        // Validate Role-ShopId Consistency
        Long shopId = validateAndResolveShopId(newRole, updateDto.getShopId());

        user.setFullName(updateDto.getFullName().trim());
        user.setPhone(updateDto.getPhone() != null ? updateDto.getPhone().trim() : null);
        user.setRole(newRole);
        user.setShopId(shopId);

        User saved = userRepository.save(user);
        return mapToUserAdminDto(saved);
    }

    @Override
    @Transactional
    public UserAdminDto updateUserStatus(String targetUserId, UserStatusUpdateDto statusDto, String currentAdminIdOrEmail) {
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng với ID: " + targetUserId));

        String newStatus = statusDto.getStatus().trim().toUpperCase();

        if ("LOCKED".equals(newStatus)) {
            // 1. Validate mandatory lockReason
            if (statusDto.getLockReason() == null || statusDto.getLockReason().trim().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lý do khóa tài khoản là bắt buộc");
            }

            // 2. Validate Admin self-lock prevention
            if (currentAdminIdOrEmail != null) {
                if (currentAdminIdOrEmail.equalsIgnoreCase(targetUser.getId()) ||
                    currentAdminIdOrEmail.equalsIgnoreCase(targetUser.getEmail()) ||
                    (targetUser.getEmployeeCode() != null && currentAdminIdOrEmail.equalsIgnoreCase(targetUser.getEmployeeCode()))) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể tự khóa tài khoản Admin của chính mình");
                }
            }

            // 3. Validate last active Admin lock prevention
            if (targetUser.getRole() == Role.ADMIN) {
                long activeAdminCount = userRepository.countByRoleAndStatus(Role.ADMIN, "ACTIVE");
                if (activeAdminCount <= 1) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể khóa Admin duy nhất còn hoạt động trong hệ thống");
                }
            }

            targetUser.setStatus("LOCKED");
            targetUser.setLockReason(statusDto.getLockReason().trim());
            targetUser.setLockedBy(currentAdminIdOrEmail != null ? currentAdminIdOrEmail : "ADMIN");
            targetUser.setLockedAt(LocalDateTime.now());
        } else if ("ACTIVE".equals(newStatus)) {
            targetUser.setStatus("ACTIVE");
            targetUser.setLockReason(null);
            targetUser.setLockedBy(null);
            targetUser.setLockedAt(null);
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái không hợp lệ (chấp nhận: ACTIVE, LOCKED)");
        }

        User saved = userRepository.save(targetUser);
        return mapToUserAdminDto(saved);
    }

    @Override
    @Transactional
    public void deleteUser(String targetUserId, String currentAdminIdOrEmail) {
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng với ID: " + targetUserId));

        if (currentAdminIdOrEmail != null &&
                (currentAdminIdOrEmail.equalsIgnoreCase(targetUser.getId()) ||
                        currentAdminIdOrEmail.equalsIgnoreCase(targetUser.getEmail()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể xóa tài khoản của chính mình");
        }

        if (targetUser.getRole() == Role.ADMIN) {
            long activeAdminCount = userRepository.countByRoleAndStatus(Role.ADMIN, "ACTIVE");
            if (activeAdminCount <= 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể xóa Admin duy nhất còn hoạt động trong hệ thống");
            }
        }

        // Xoa mem: cac don hang/danh gia/audit log cu con tham chieu user_id nen
        // khong the hard-delete ma khong pha vo rang buoc khoa ngoai. Dat
        // status=BANNED de tai khoan bi khoa vinh vien va khong the dang nhap
        // (AuthService.login va JwtAuthenticationFilter da chan status nay).
        targetUser.setStatus("BANNED");
        targetUser.setLockReason("Tài khoản đã bị xóa bởi quản trị viên");
        targetUser.setLockedBy(currentAdminIdOrEmail != null ? currentAdminIdOrEmail : "ADMIN");
        targetUser.setLockedAt(LocalDateTime.now());
        userRepository.save(targetUser);
    }

    @Override
    @Transactional
    public ResetPasswordResponseDto resetUserPassword(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng với ID: " + id));

        // Generate temporary password (returned ONCE in response without logging)
        String tempPassword = generateRandomPassword();
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        user.setMustChangePassword(true);
        // Mat khau moi do quan ly cap: go khoa tam do dang nhap sai truoc do,
        // neu khong nguoi dung van bi chan 15 phut du nhap dung mat khau tam.
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        return ResetPasswordResponseDto.builder()
                .message("Khôi phục mật khẩu thành công. Đã cấp mật khẩu tạm thời (trả về 1 lần duy nhất) và bắt buộc đổi mật khẩu khi đăng nhập.")
                .mustChangePassword(true)
                .temporaryPassword(tempPassword)
                .build();
    }

    @Override
    public List<RoleWithPermissionsDto> getAllRolesWithPermissions() {
        List<RoleWithPermissionsDto> result = new ArrayList<>();
        
        for (Role roleEnum : Role.values()) {
            String code = roleEnum.name();
            String name = getRoleDisplayName(roleEnum);
            String desc = getRoleDescription(roleEnum);

            List<RolePermissionEntity> perms = rolePermissionService.getPermissionsForRole(code);
            List<String> permissionList = perms.stream()
                    .map(RolePermissionEntity::getPermission)
                    .collect(Collectors.toList());

            if (permissionList.isEmpty()) {
                permissionList = getDefaultPermissionsForRole(roleEnum);
            }

            result.add(RoleWithPermissionsDto.builder()
                    .code(code)
                    .name(name)
                    .description(desc)
                    .permissions(permissionList)
                    .build());
        }

        return result;
    }

    private Long validateAndResolveShopId(Role role, Long shopId) {
        if (SHOP_BOUND_ROLES.contains(role)) {
            if (shopId == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Vai trò " + role.name() + " (Chủ shop / Nhân viên cửa hàng) bắt buộc phải thuộc một Cửa hàng (shopId không được để trống)");
            }
            return shopId;
        } else {
            // Corporate roles (ADMIN, MARKETING_STAFF, USER): shopId is null
            return null;
        }
    }

    private UserAdminDto mapToUserAdminDto(User user) {
        // Doc qua cache thay vi query moi user: ham nay chay trong Page.map() nen truoc day
        // /api/admin/users?size=100 sinh ra 100 query role_permissions (N+1) -> 13-22s.
        List<RolePermissionEntity> perms = rolePermissionService.getPermissionsForRole(user.getRole().name());
        List<String> permissions = perms.stream()
                .map(RolePermissionEntity::getPermission)
                .collect(Collectors.toList());

        if (permissions.isEmpty()) {
            permissions = getDefaultPermissionsForRole(user.getRole());
        }

        return UserAdminDto.builder()
                .id(user.getId())
                .employeeCode(user.getEmployeeCode())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .shopId(user.getShopId())
                .status(user.getStatus())
                .lockReason(user.getLockReason())
                .lockedBy(user.getLockedBy())
                .lockedAt(user.getLockedAt())
                .mustChangePassword(user.isMustChangePassword())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .permissions(permissions)
                .build();
    }

    private String generateRandomPassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder("EtTee@");
        for (int i = 0; i < 6; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }

    private String getRoleDisplayName(Role role) {
        switch (role) {
            case ADMIN: return "Quản trị viên Hệ thống";
            case SHOP_OWNER: return "Chủ cửa hàng";
            case SALES_STAFF: return "Nhân viên Bán hàng / CSKH";
            case WAREHOUSE_STAFF: return "Nhân viên Quản lý Kho";
            case SHIPPING_STAFF: return "Nhân viên Vận chuyển / Shipper";
            case MARKETING_STAFF: return "Nhân viên Marketing (Tập trung)";
            case STAFF: return "Nhân viên Cửa hàng (Chung)";
            case USER: return "Khách hàng mua sắm";
            default: return role.name();
        }
    }

    private String getRoleDescription(Role role) {
        switch (role) {
            case ADMIN: return "Toàn quyền quản trị hệ thống, người dùng, phân quyền và danh mục";
            case SHOP_OWNER: return "Quản lý sản phẩm, tồn kho và nhân sự thuộc cửa hàng của mình";
            case SALES_STAFF: return "Xử lý đơn hàng, hỗ trợ tư vấn khách hàng thuộc cửa hàng";
            case WAREHOUSE_STAFF: return "Kiểm kê hàng hóa, nhập/xuất kho thuộc cửa hàng";
            case SHIPPING_STAFF: return "Cập nhật trạng thái giao hàng và tải lên xác nhận giao hàng (POD)";
            case MARKETING_STAFF: return "Tạo chiến dịch, mã giảm giá và quản lý danh mục hiển thị toàn hệ thống";
            default: return "Quyền hạn cơ bản theo vai trò";
        }
    }

    private List<String> getDefaultPermissionsForRole(Role role) {
        switch (role) {
            case ADMIN:
                return List.of(PermissionConstants.MANAGE_USER, PermissionConstants.MANAGE_ROLE_PERMISSION,
                        PermissionConstants.MANAGE_GLOBAL_CATEGORY, PermissionConstants.CONFIG_PAYMENT_SHIPPING,
                        PermissionConstants.VIEW_SYS_ERROR_LOG, PermissionConstants.VIEW_AUDIT_LOG,
                        PermissionConstants.MANAGE_BACKUP, PermissionConstants.MANAGE_AI_MODEL_FEATURE_FLAG,
                        PermissionConstants.MANAGE_MAILING);
            case SHOP_OWNER:
                return List.of(PermissionConstants.MANAGE_SHOP_STAFF, PermissionConstants.VIEW_SHOP_DASHBOARD,
                        PermissionConstants.VIEW_SHOP_LOG, PermissionConstants.APPROVE_SHOP_PROMO,
                        PermissionConstants.MANAGE_SHOP_INVENTORY, PermissionConstants.MANAGE_SHOP_CATEGORY,
                        PermissionConstants.MANAGE_SHOP_PRODUCT);
            case SALES_STAFF:
                return List.of(PermissionConstants.VIEW_NEW_ORDER, PermissionConstants.VERIFY_ORDER,
                        PermissionConstants.PROCESS_ORDER_NOTE, PermissionConstants.REQUEST_STOCK_HOLD,
                        PermissionConstants.MONITOR_ORDER_SLA);
            case CSKH_STAFF:
                return List.of(PermissionConstants.CHAT_CUSTOMER, PermissionConstants.MANAGE_TICKET,
                        PermissionConstants.SEARCH_ORDER_BASIC, PermissionConstants.PROCESS_RETURN_REFUND,
                        PermissionConstants.ISSUE_SUPPORT_VOUCHER, PermissionConstants.ESCALATE_TICKET);
            case WAREHOUSE_STAFF:
                return List.of(PermissionConstants.INBOUND_STOCK, PermissionConstants.COUNT_STOCK,
                        PermissionConstants.MANAGE_STOCK_LOCATION, PermissionConstants.ADJUST_STOCK,
                        PermissionConstants.HOLD_STOCK_ORDER, PermissionConstants.PICK_PACK_LABEL,
                        PermissionConstants.HANDOVER_SHIPPING, PermissionConstants.PROPOSE_RESTOCK);
            case SHIPPING_STAFF:
                return List.of(PermissionConstants.RECEIVE_PACKED_LIST, PermissionConstants.MANAGE_WAYBILL,
                        PermissionConstants.CONFIRM_HANDOVER, PermissionConstants.UPDATE_SHIPPING_EXCEPTION,
                        PermissionConstants.UPLOAD_POD, PermissionConstants.RECONCILE_COD);
            case MARKETING_STAFF:
                return List.of(PermissionConstants.MANAGE_BANNER_LANDING, PermissionConstants.MANAGE_CAMPAIGN_PROMO,
                        PermissionConstants.MANAGE_PRODUCT_PLACEMENT, PermissionConstants.AB_TEST_CAMPAIGN,
                        PermissionConstants.VIEW_CAMPAIGN_ANALYTICS);
            case STAFF:
                return List.of(PermissionConstants.ORDER_VIEW, PermissionConstants.PRODUCT_VIEW);
            default:
                return List.of(PermissionConstants.PROFILE_VIEW);
        }
    }
}
