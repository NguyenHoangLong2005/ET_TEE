package com.nguyenhoanglong.config;

import com.nguyenhoanglong.entity.Role;
import com.nguyenhoanglong.entity.RoleEntity;
import com.nguyenhoanglong.entity.RolePermissionEntity;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.RolePermissionRepository;
import com.nguyenhoanglong.repository.RoleRepository;
import com.nguyenhoanglong.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.demo-accounts.enabled:false}")
    private boolean demoAccountsEnabled;

    @Value("${app.seed.demo-accounts.password:}")
    private String demoPassword;

    public DataSeeder(UserRepository userRepository,
                      RoleRepository roleRepository,
                      RolePermissionRepository rolePermissionRepository,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Roles + permissions are reference data: always required, never sensitive.
        seedRolesAndPermissions();

        // Demo staff accounts are NOT reference data. Seeding them unconditionally
        // created admin@et.tee with a hardcoded password on every environment,
        // including production. They now require an explicit opt-in.
        if (!demoAccountsEnabled) {
            log.info("Demo staff accounts disabled (app.seed.demo-accounts.enabled=false). Seeded roles/permissions only.");
            return;
        }

        String rawPassword = resolveDemoPassword();
        String encoded = passwordEncoder.encode(rawPassword);

        seedUser("EMP-001", "admin@et.tee", "Admin (Quản trị viên)", Role.ADMIN, null, encoded);
        seedUser("EMP-002", "owner@et.tee", "Chủ cửa hàng", Role.SHOP_OWNER, 1L, encoded);
        seedUser("EMP-003", "marketing@et.tee", "Nhân viên Marketing", Role.MARKETING_STAFF, 1L, encoded);
        seedUser("EMP-004", "sales@et.tee", "Nhân viên Bán hàng", Role.SALES_STAFF, 1L, encoded);
        seedUser("EMP-005", "warehouse@et.tee", "Nhân viên Kho", Role.WAREHOUSE_STAFF, 1L, encoded);
        seedUser("EMP-006", "shipping@et.tee", "Nhân viên Vận chuyển", Role.SHIPPING_STAFF, 1L, encoded);
        seedUser("EMP-007", "staff@et.tee", "Nhân viên Cửa hàng (Chung)", Role.STAFF, 1L, encoded);
        seedUser("EMP-008", "cskh@et.tee", "Nhân viên CSKH", Role.CSKH_STAFF, 1L, encoded);

        log.warn("Demo staff accounts seeded. Every seeded account must change its password at first login.");
    }

    /**
     * Uses the configured password when one is supplied, otherwise generates a random
     * one and prints it once. Never falls back to a constant baked into the source.
     */
    private String resolveDemoPassword() {
        if (demoPassword != null && !demoPassword.isBlank()) {
            return demoPassword;
        }
        String generated = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        log.warn("app.seed.demo-accounts.password is not set. Generated one-time password for seeded accounts: {}", generated);
        return generated;
    }

    private void seedRolesAndPermissions() {
        Map<Role, String> roleNames = Map.of(
                Role.ADMIN, "Quản trị viên Hệ thống",
                Role.SHOP_OWNER, "Chủ cửa hàng (Chi nhánh)",
                Role.SALES_STAFF, "Nhân viên Bán hàng / CSKH",
                Role.WAREHOUSE_STAFF, "Nhân viên Quản lý Kho",
                Role.SHIPPING_STAFF, "Nhân viên Vận chuyển / Shipper",
                Role.MARKETING_STAFF, "Nhân viên Marketing",
                Role.STAFF, "Nhân viên Cửa hàng (Chung)",
                Role.USER, "Khách hàng mua sắm"
        );

        Map<Role, List<String>> rolePermissions = Map.of(
                Role.ADMIN, List.of(
                        com.nguyenhoanglong.constant.PermissionConstants.MANAGE_USER,
                        com.nguyenhoanglong.constant.PermissionConstants.MANAGE_ROLE_PERMISSION,
                        com.nguyenhoanglong.constant.PermissionConstants.MANAGE_GLOBAL_CATEGORY,
                        com.nguyenhoanglong.constant.PermissionConstants.CONFIG_PAYMENT_SHIPPING,
                        com.nguyenhoanglong.constant.PermissionConstants.VIEW_SYS_ERROR_LOG,
                        com.nguyenhoanglong.constant.PermissionConstants.VIEW_AUDIT_LOG,
                        com.nguyenhoanglong.constant.PermissionConstants.MANAGE_BACKUP,
                        com.nguyenhoanglong.constant.PermissionConstants.MANAGE_AI_MODEL_FEATURE_FLAG,
                        com.nguyenhoanglong.constant.PermissionConstants.MANAGE_MAILING
                ),
                Role.SHOP_OWNER, List.of(
                        com.nguyenhoanglong.constant.PermissionConstants.MANAGE_SHOP_STAFF,
                        com.nguyenhoanglong.constant.PermissionConstants.VIEW_SHOP_DASHBOARD,
                        com.nguyenhoanglong.constant.PermissionConstants.VIEW_SHOP_LOG,
                        com.nguyenhoanglong.constant.PermissionConstants.APPROVE_SHOP_PROMO,
                        com.nguyenhoanglong.constant.PermissionConstants.MANAGE_SHOP_INVENTORY,
                        com.nguyenhoanglong.constant.PermissionConstants.MANAGE_SHOP_CATEGORY,
                        com.nguyenhoanglong.constant.PermissionConstants.MANAGE_SHOP_PRODUCT
                ),
                Role.SALES_STAFF, List.of(
                        com.nguyenhoanglong.constant.PermissionConstants.VIEW_NEW_ORDER,
                        com.nguyenhoanglong.constant.PermissionConstants.VERIFY_ORDER,
                        com.nguyenhoanglong.constant.PermissionConstants.PROCESS_ORDER_NOTE,
                        com.nguyenhoanglong.constant.PermissionConstants.REQUEST_STOCK_HOLD,
                        com.nguyenhoanglong.constant.PermissionConstants.MONITOR_ORDER_SLA
                ),
                Role.CSKH_STAFF, List.of(
                        com.nguyenhoanglong.constant.PermissionConstants.CHAT_CUSTOMER,
                        com.nguyenhoanglong.constant.PermissionConstants.MANAGE_TICKET,
                        com.nguyenhoanglong.constant.PermissionConstants.SEARCH_ORDER_BASIC,
                        com.nguyenhoanglong.constant.PermissionConstants.PROCESS_RETURN_REFUND,
                        com.nguyenhoanglong.constant.PermissionConstants.ISSUE_SUPPORT_VOUCHER,
                        com.nguyenhoanglong.constant.PermissionConstants.ESCALATE_TICKET
                ),
                Role.WAREHOUSE_STAFF, List.of(
                        com.nguyenhoanglong.constant.PermissionConstants.INBOUND_STOCK,
                        com.nguyenhoanglong.constant.PermissionConstants.COUNT_STOCK,
                        com.nguyenhoanglong.constant.PermissionConstants.MANAGE_STOCK_LOCATION,
                        com.nguyenhoanglong.constant.PermissionConstants.ADJUST_STOCK,
                        com.nguyenhoanglong.constant.PermissionConstants.HOLD_STOCK_ORDER,
                        com.nguyenhoanglong.constant.PermissionConstants.PICK_PACK_LABEL,
                        com.nguyenhoanglong.constant.PermissionConstants.HANDOVER_SHIPPING,
                        com.nguyenhoanglong.constant.PermissionConstants.PROPOSE_RESTOCK
                ),
                Role.SHIPPING_STAFF, List.of(
                        com.nguyenhoanglong.constant.PermissionConstants.RECEIVE_PACKED_LIST,
                        com.nguyenhoanglong.constant.PermissionConstants.MANAGE_WAYBILL,
                        com.nguyenhoanglong.constant.PermissionConstants.CONFIRM_HANDOVER,
                        com.nguyenhoanglong.constant.PermissionConstants.UPDATE_SHIPPING_EXCEPTION,
                        com.nguyenhoanglong.constant.PermissionConstants.UPLOAD_POD,
                        com.nguyenhoanglong.constant.PermissionConstants.RECONCILE_COD
                ),
                Role.MARKETING_STAFF, List.of(
                        com.nguyenhoanglong.constant.PermissionConstants.MANAGE_BANNER_LANDING,
                        com.nguyenhoanglong.constant.PermissionConstants.MANAGE_CAMPAIGN_PROMO,
                        com.nguyenhoanglong.constant.PermissionConstants.MANAGE_PRODUCT_PLACEMENT,
                        com.nguyenhoanglong.constant.PermissionConstants.AB_TEST_CAMPAIGN,
                        com.nguyenhoanglong.constant.PermissionConstants.VIEW_CAMPAIGN_ANALYTICS
                ),
                Role.STAFF, List.of(
                        com.nguyenhoanglong.constant.PermissionConstants.ORDER_VIEW, 
                        com.nguyenhoanglong.constant.PermissionConstants.PRODUCT_VIEW
                ),
                Role.USER, List.of(
                        com.nguyenhoanglong.constant.PermissionConstants.PROFILE_VIEW
                )
        );

        for (Role r : Role.values()) {
            String code = r.name();
            if (!roleRepository.existsById(code)) {
                roleRepository.save(RoleEntity.builder()
                        .code(code)
                        .name(roleNames.getOrDefault(r, code))
                        .description("Quyền hạn cho vai trò " + roleNames.getOrDefault(r, code))
                        .build());
            }

            List<String> perms = rolePermissions.getOrDefault(r, List.of());
            for (String perm : perms) {
                if (rolePermissionRepository.findByRoleCode(code).stream().noneMatch(p -> p.getPermission().equalsIgnoreCase(perm))) {
                    rolePermissionRepository.save(RolePermissionEntity.builder()
                            .roleCode(code)
                            .permission(perm)
                            .build());
                }
            }
        }
    }

    private void seedUser(String empCode, String email, String fullName, Role role, Long shopId, String encodedPassword) {
        if (userRepository.findByEmail(email).isEmpty()) {
            User user = new User();
            user.setEmployeeCode(empCode);
            user.setEmail(email);
            user.setFullName(fullName);
            user.setPasswordHash(encodedPassword);
            user.setRole(role);
            user.setShopId(shopId);
            user.setStatus("ACTIVE");
            user.setEmailVerified(true);
            // Seeded accounts always carry a shared bootstrap password, so force a
            // change at first login rather than leaving it usable indefinitely.
            user.setMustChangePassword(true);
            userRepository.save(user);
        }
    }
}
