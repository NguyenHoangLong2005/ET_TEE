package com.nguyenhoanglong;

import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.entity.Role;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.UserRepository;
import com.nguyenhoanglong.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class AdminUserApiIntegrationTest {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("Case 1: Create user with employeeCode and check duplicate constraint")
    public void testCase1_CreateUserWithEmployeeCodeAndDuplicateCheck() {
        UserCreateDto user1 = new UserCreateDto();
        user1.setEmployeeCode("EMP-8888");
        user1.setFullName("Nguyen Van A");
        user1.setEmail("user.emp1@et.tee");
        user1.setRoleCode("SALES_STAFF");
        user1.setShopId(1L);

        UserAdminDto created = userService.createUser(user1);
        assertNotNull(created.getId());
        assertEquals("EMP-8888", created.getEmployeeCode());

        // Try creating another user with duplicate employeeCode
        UserCreateDto user2 = new UserCreateDto();
        user2.setEmployeeCode("EMP-8888");
        user2.setFullName("Nguyen Van B");
        user2.setEmail("user.emp2@et.tee");
        user2.setRoleCode("SALES_STAFF");
        user2.setShopId(1L);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            userService.createUser(user2);
        });
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Mã nhân viên đã tồn tại"));
    }

    @Test
    @DisplayName("Case 2: Role-ShopId consistency validation for all 5 shop-bound roles")
    public void testCase2_RoleShopIdValidation() {
        List<String> shopBoundRoleCodes = List.of("SHOP_OWNER", "SALES_STAFF", "CSKH_STAFF", "WAREHOUSE_STAFF", "SHIPPING_STAFF", "STAFF");

        int index = 1;
        for (String roleCode : shopBoundRoleCodes) {
            UserCreateDto missingShopDto = new UserCreateDto();
            missingShopDto.setEmployeeCode("EMP-NOSHOP-" + index);
            missingShopDto.setFullName("Staff Missing Shop " + roleCode);
            missingShopDto.setEmail("noshop." + roleCode.toLowerCase() + index + "@et.tee");
            missingShopDto.setRoleCode(roleCode);
            missingShopDto.setShopId(null);

            ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
                userService.createUser(missingShopDto);
            }, "Expected 400 Bad Request when " + roleCode + " missing shopId");

            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
            assertTrue(ex.getReason().contains("bắt buộc phải thuộc một Cửa hàng"),
                    "Reason should explain mandatory shopId for " + roleCode + ", got: " + ex.getReason());

            // Creating with valid shopId should succeed
            missingShopDto.setShopId((long) index);
            UserAdminDto created = userService.createUser(missingShopDto);
            assertNotNull(created.getId());
            assertEquals((long) index, created.getShopId());
            assertEquals(roleCode, created.getRole());

            index++;
        }

        // Corporate HQ roles (ADMIN, MARKETING_STAFF) auto-resolve shopId to null
        UserCreateDto mktDto = new UserCreateDto();
        mktDto.setEmployeeCode("EMP-MKT-HQ");
        mktDto.setFullName("Marketing HQ");
        mktDto.setEmail("mkt.corporate@et.tee");
        mktDto.setRoleCode("MARKETING_STAFF");
        mktDto.setShopId(99L); // Passed 99L, should be resolved to null

        UserAdminDto createdMkt = userService.createUser(mktDto);
        assertNull(createdMkt.getShopId());
    }

    @Test
    @DisplayName("Case 3: Lock user requires mandatory lockReason")
    public void testCase3_LockUserMandatoryLockReason() {
        UserCreateDto userDto = new UserCreateDto();
        userDto.setEmployeeCode("EMP-LOCK-1");
        userDto.setFullName("Staff To Lock");
        userDto.setEmail("staff.tolock@et.tee");
        userDto.setRoleCode("SALES_STAFF");
        userDto.setShopId(1L);

        UserAdminDto created = userService.createUser(userDto);

        // Try locking without lockReason -> 400 Bad Request
        UserStatusUpdateDto lockStatusNoReason = new UserStatusUpdateDto("LOCKED", "");
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            userService.updateUserStatus(created.getId(), lockStatusNoReason, "EMP-ADMIN");
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Lý do khóa tài khoản là bắt buộc"));

        // Lock with valid reason -> OK
        UserStatusUpdateDto lockStatusValid = new UserStatusUpdateDto("LOCKED", "Vi phạm chính sách bảo mật");
        UserAdminDto lockedUser = userService.updateUserStatus(created.getId(), lockStatusValid, "EMP-ADMIN");

        assertEquals("LOCKED", lockedUser.getStatus());
        assertEquals("Vi phạm chính sách bảo mật", lockedUser.getLockReason());
        assertEquals("EMP-ADMIN", lockedUser.getLockedBy());
        assertNotNull(lockedUser.getLockedAt());
    }

    @Test
    @DisplayName("Case 4: Prevent Admin self-lock")
    public void testCase4_AdminSelfLockPrevention() {
        UserCreateDto adminDto = new UserCreateDto();
        adminDto.setEmployeeCode("EMP-ADM-SELF");
        adminDto.setFullName("Admin Self");
        adminDto.setEmail("admin.self@et.tee");
        adminDto.setRoleCode("ADMIN");

        UserAdminDto createdAdmin = userService.createUser(adminDto);

        UserStatusUpdateDto lockDto = new UserStatusUpdateDto("LOCKED", "Tự khóa chính mình");

        // Try to lock using own ID / Email / EmployeeCode
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            userService.updateUserStatus(createdAdmin.getId(), lockDto, createdAdmin.getId());
        });
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Không thể tự khóa tài khoản Admin của chính mình"));
    }

    @Test
    @DisplayName("Case 5: Prevent locking or changing role of the last active Admin")
    public void testCase5_LastActiveAdminLockAndRoleChangePrevention() {
        // Lock all existing active admin accounts in test DB except 1 new sole admin
        List<User> existingAdmins = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ADMIN && "ACTIVE".equalsIgnoreCase(u.getStatus()))
                .toList();

        for (User u : existingAdmins) {
            u.setStatus("LOCKED");
            u.setLockReason("Cleanup test admins for sole admin test");
            userRepository.save(u);
        }

        // Create sole active admin
        UserCreateDto soleAdminDto = new UserCreateDto();
        soleAdminDto.setEmployeeCode("EMP-SOLE-ADM");
        soleAdminDto.setFullName("Sole Active Admin");
        soleAdminDto.setEmail("sole.active.admin@et.tee");
        soleAdminDto.setRoleCode("ADMIN");

        UserAdminDto soleAdmin = userService.createUser(soleAdminDto);
        assertEquals(1, userRepository.countByRoleAndStatus(Role.ADMIN, "ACTIVE"));

        // 1. Assert locking sole active admin throws 400 Bad Request
        UserStatusUpdateDto lockDto = new UserStatusUpdateDto("LOCKED", "Lock sole admin");
        ResponseStatusException lockEx = assertThrows(ResponseStatusException.class, () -> {
            userService.updateUserStatus(soleAdmin.getId(), lockDto, "EMP-OTHER-ACTOR");
        });
        assertEquals(HttpStatus.BAD_REQUEST, lockEx.getStatusCode());
        assertTrue(lockEx.getReason().contains("Không thể khóa Admin duy nhất còn hoạt động trong hệ thống"),
                "Expected sole admin lock error, got: " + lockEx.getReason());

        // 2. Assert PUT changing role of sole active admin to SALES_STAFF throws 400 Bad Request
        UserUpdateDto roleChangeDto = new UserUpdateDto();
        roleChangeDto.setEmployeeCode(soleAdmin.getEmployeeCode());
        roleChangeDto.setFullName(soleAdmin.getFullName());
        roleChangeDto.setRoleCode("SALES_STAFF");
        roleChangeDto.setShopId(1L);

        ResponseStatusException roleEx = assertThrows(ResponseStatusException.class, () -> {
            userService.updateUser(soleAdmin.getId(), roleChangeDto);
        });
        assertEquals(HttpStatus.BAD_REQUEST, roleEx.getStatusCode());
        assertTrue(roleEx.getReason().contains("Không thể thay đổi vai trò của Admin duy nhất còn hoạt động trong hệ thống"),
                "Expected sole admin role change error, got: " + roleEx.getReason());
    }

    @Test
    @DisplayName("Case 6: Password reset returns temp password once and sets mustChangePassword=true")
    public void testCase6_ResetPassword() {
        UserCreateDto userDto = new UserCreateDto();
        userDto.setEmployeeCode("EMP-RESET-1");
        userDto.setFullName("Staff Reset Pass");
        userDto.setEmail("staff.resetpass@et.tee");
        userDto.setRoleCode("SALES_STAFF");
        userDto.setShopId(1L);

        UserAdminDto created = userService.createUser(userDto);
        // Tai khoan nhan vien moi tao luon nhan mat khau tam va bat buoc doi o lan
        // dang nhap dau tien (UserServiceImpl.createUser dat mustChangePassword=true).
        assertTrue(created.isMustChangePassword());

        ResetPasswordResponseDto resetResp = userService.resetUserPassword(created.getId());

        assertTrue(resetResp.isMustChangePassword());
        assertNotNull(resetResp.getTemporaryPassword());
        assertTrue(resetResp.getTemporaryPassword().startsWith("EtTee@"));

        UserAdminDto updated = userService.getUserById(created.getId());
        assertTrue(updated.isMustChangePassword());
    }
}
