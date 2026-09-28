package com.nguyenhoanglong.config;

import com.nguyenhoanglong.entity.Role;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Fix user shop_id assignment
 * Ensures all staff users have shop_id set for proper service functionality
 */
@Component
public class UserShopIdFixer implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(UserShopIdFixer.class);
    
    private final UserRepository userRepository;
    
    public UserShopIdFixer(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    @Override
    @Transactional
    public void run(String... args) {
        try {
            List<Role> staffRoles = List.of(
                Role.SALES_STAFF, 
                Role.WAREHOUSE_STAFF, 
                Role.SHIPPING_STAFF, 
                Role.STAFF, 
                Role.SHOP_OWNER
            );
            
            // Count users without shop_id
            long count = userRepository.countByShopIdIsNullAndRoleIn(staffRoles);
            if (count > 0) {
                log.info("Found {} staff users without shop_id, assigning shop_id = 1", count);
                userRepository.fixStaffShopId(staffRoles);
                log.info("Staff shop_id fix completed successfully");
            } else {
                log.info("All staff users already have shop_id assigned");
            }
        } catch (Exception e) {
            log.warn("User shop_id fix skipped: {}", e.getMessage());
        }
    }
}
