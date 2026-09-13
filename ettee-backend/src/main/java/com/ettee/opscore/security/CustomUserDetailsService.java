package com.ettee.opscore.security;

import com.ettee.opscore.identity.entity.AppUser;
import com.ettee.opscore.identity.repository.UserRepository;
import com.ettee.opscore.identity.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String usernameOrPhone) {
        AppUser user = userRepository.findByEmail(usernameOrPhone)
                .or(() -> userRepository.findByPhone(usernameOrPhone))
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy tài khoản: " + usernameOrPhone));

        if (!user.isStaff()) {
            // Khu vực Admin/Store Owner/CSKH chỉ dành cho nhân viên nội bộ.
            throw new UsernameNotFoundException("Tài khoản không thuộc hệ thống nội bộ");
        }

        var roleCodes = userRoleRepository.findRoleCodesByUserId(user.getId());
        var permissionCodes = userRoleRepository.findPermissionCodesByUserId(user.getId());
        return new SecurityUser(user, roleCodes, permissionCodes);
    }
}
