package com.ettee.opscore.security;

import com.ettee.opscore.identity.entity.AccountStatus;
import com.ettee.opscore.identity.entity.AppUser;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * Adapter giữa AppUser (entity nghiệp vụ) và UserDetails (Spring Security).
 * Authorities gồm cả ROLE_xxx (từ roles) và quyền chi tiết (từ permissions),
 * để có thể dùng @PreAuthorize("hasRole('ADMIN')") lẫn @PreAuthorize("hasAuthority('user.lock')").
 */
public class SecurityUser implements UserDetails {

    private final UUID userId;
    private final String usernameForLogin; // email hoặc phone
    private final String passwordHash;
    private final boolean enabled;
    private final List<String> roleCodes;
    private final List<String> permissionCodes;

    public SecurityUser(AppUser user, List<String> roleCodes, List<String> permissionCodes) {
        this.userId = user.getId();
        this.usernameForLogin = user.getEmail() != null ? user.getEmail() : user.getPhone();
        this.passwordHash = user.getPasswordHash();
        this.enabled = user.getStatus() == AccountStatus.active;
        this.roleCodes = roleCodes;
        this.permissionCodes = permissionCodes;
    }

    public UUID getUserId() {
        return userId;
    }

    public List<String> getRoleCodes() {
        return roleCodes;
    }

    public List<String> getPermissionCodes() {
        return permissionCodes;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Stream.concat(
                roleCodes.stream().map(c -> new SimpleGrantedAuthority("ROLE_" + c.toUpperCase())),
                permissionCodes.stream().map(SimpleGrantedAuthority::new)
        ).toList();
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return usernameForLogin;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return enabled; // locked/pending_verification đều chặn đăng nhập nội bộ
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
