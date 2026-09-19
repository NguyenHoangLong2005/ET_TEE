package com.nguyenhoanglong.config;

import com.nguyenhoanglong.entity.Role;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        String defaultPassword = passwordEncoder.encode("Check@123");

        seedUser("admin@et.tee", "Admin (Quản trị viên)", Role.ADMIN, defaultPassword);
        seedUser("owner@et.tee", "Chủ cửa hàng", Role.SHOP_OWNER, defaultPassword);
        seedUser("marketing@et.tee", "Nhân viên Marketing", Role.MARKETING_STAFF, defaultPassword);
        seedUser("sales@et.tee", "Nhân viên Bán hàng", Role.SALES_STAFF, defaultPassword);
        seedUser("warehouse@et.tee", "Nhân viên Kho", Role.WAREHOUSE_STAFF, defaultPassword);
        seedUser("shipping@et.tee", "Nhân viên Vận chuyển", Role.SHIPPING_STAFF, defaultPassword);
        seedUser("staff@et.tee", "Nhân viên Cửa hàng (Chung)", Role.STAFF, defaultPassword);
        
        System.out.println("Data seeding completed: Created demo accounts (admin, marketing, staff).");
    }

    private void seedUser(String email, String fullName, Role role, String encodedPassword) {
        if (userRepository.findByEmail(email).isEmpty()) {
            User user = new User();
            user.setEmail(email);
            user.setFullName(fullName);
            user.setPasswordHash(encodedPassword);
            user.setRole(role);
            user.setStatus("ACTIVE");
            user.setEmailVerified(true);
            userRepository.save(user);
        }
    }
}
