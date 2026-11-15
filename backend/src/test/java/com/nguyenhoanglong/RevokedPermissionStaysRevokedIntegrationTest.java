package com.nguyenhoanglong;

import com.nguyenhoanglong.config.DataSeeder;
import com.nguyenhoanglong.constant.PermissionConstants;
import com.nguyenhoanglong.entity.RolePermissionEntity;
import com.nguyenhoanglong.repository.RolePermissionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

/** The seeder used to re-add every missing default permission on each start, undoing revocations. */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RevokedPermissionStaysRevokedIntegrationTest {

    @Autowired private DataSeeder dataSeeder;
    @Autowired private RolePermissionRepository rolePermissionRepository;

    @Test
    void restartDoesNotReGrantARevokedDefault() throws Exception {
        String role = "SHIPPING_STAFF";
        String perm = PermissionConstants.RECONCILE_COD;
        rolePermissionRepository.findByRoleCode(role).stream()
                .filter(p -> p.getPermission().equalsIgnoreCase(perm))
                .forEach(rolePermissionRepository::delete);
        rolePermissionRepository.flush();

        dataSeeder.run(); // what every application start does

        assertThat(rolePermissionRepository.findByRoleCode(role).stream().map(RolePermissionEntity::getPermission))
                .doesNotContain(perm);
    }
}
