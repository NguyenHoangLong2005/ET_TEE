package com.nguyenhoanglong.config;

import com.nguyenhoanglong.constant.PermissionConstants;
import com.nguyenhoanglong.entity.RolePermissionEntity;
import com.nguyenhoanglong.repository.UserRepository;
import com.nguyenhoanglong.service.RolePermissionService;
import com.nguyenhoanglong.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Map<String, List<String>> DEFAULT_PERMISSIONS = Map.of(
        "ADMIN", List.of(
            PermissionConstants.MANAGE_USER, PermissionConstants.MANAGE_ROLE_PERMISSION,
            PermissionConstants.MANAGE_GLOBAL_CATEGORY, PermissionConstants.CONFIG_PAYMENT_SHIPPING,
            PermissionConstants.VIEW_SYS_ERROR_LOG, PermissionConstants.VIEW_AUDIT_LOG,
            PermissionConstants.MANAGE_BACKUP, PermissionConstants.MANAGE_AI_MODEL_FEATURE_FLAG,
            PermissionConstants.MANAGE_MAILING),
        "SHOP_OWNER", List.of(
            PermissionConstants.MANAGE_SHOP_STAFF, PermissionConstants.VIEW_SHOP_DASHBOARD,
            PermissionConstants.VIEW_SHOP_LOG, PermissionConstants.APPROVE_SHOP_PROMO,
            PermissionConstants.MANAGE_SHOP_INVENTORY, PermissionConstants.MANAGE_SHOP_CATEGORY,
            PermissionConstants.MANAGE_SHOP_PRODUCT),
        "SALES_STAFF", List.of(
            PermissionConstants.VIEW_NEW_ORDER, PermissionConstants.VERIFY_ORDER,
            PermissionConstants.PROCESS_ORDER_NOTE, PermissionConstants.REQUEST_STOCK_HOLD,
            PermissionConstants.MONITOR_ORDER_SLA),
        "CSKH_STAFF", List.of(
            PermissionConstants.CHAT_CUSTOMER, PermissionConstants.MANAGE_TICKET,
            PermissionConstants.SEARCH_ORDER_BASIC, PermissionConstants.PROCESS_RETURN_REFUND,
            PermissionConstants.ISSUE_SUPPORT_VOUCHER, PermissionConstants.ESCALATE_TICKET),
        "WAREHOUSE_STAFF", List.of(
            PermissionConstants.INBOUND_STOCK, PermissionConstants.COUNT_STOCK,
            PermissionConstants.MANAGE_STOCK_LOCATION, PermissionConstants.ADJUST_STOCK,
            PermissionConstants.HOLD_STOCK_ORDER, PermissionConstants.PICK_PACK_LABEL,
            PermissionConstants.HANDOVER_SHIPPING, PermissionConstants.PROPOSE_RESTOCK),
        "SHIPPING_STAFF", List.of(
            PermissionConstants.RECEIVE_PACKED_LIST, PermissionConstants.MANAGE_WAYBILL,
            PermissionConstants.CONFIRM_HANDOVER, PermissionConstants.UPDATE_SHIPPING_EXCEPTION,
            PermissionConstants.UPLOAD_POD, PermissionConstants.RECONCILE_COD),
        "MARKETING_STAFF", List.of(
            PermissionConstants.MANAGE_BANNER_LANDING, PermissionConstants.MANAGE_CAMPAIGN_PROMO,
            PermissionConstants.MANAGE_PRODUCT_PLACEMENT, PermissionConstants.AB_TEST_CAMPAIGN,
            PermissionConstants.VIEW_CAMPAIGN_ANALYTICS),
        "STAFF", List.of(PermissionConstants.ORDER_VIEW, PermissionConstants.PRODUCT_VIEW),
        "USER", List.of(PermissionConstants.PROFILE_VIEW)
    );

    private final JwtService jwtService;
    private final RolePermissionService rolePermissionService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, RolePermissionService rolePermissionService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.rolePermissionService = rolePermissionService;
        this.userRepository = userRepository;
    }

    private static boolean isPasswordChangePath(String uri) {
        return uri.startsWith("/api/auth/")
                || uri.startsWith("/api/staff/me/")
                || uri.equals("/api/account/change-password");
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String userEmail;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        try {
            userEmail = jwtService.extractUsername(jwt);
            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                if (jwtService.isTokenValid(jwt, userEmail)) {
                    // Read the account state fresh instead of trusting the token for 24h:
                    //  - a deleted account has no row and used to stay authenticated;
                    //  - the role claim kept a demoted / re-assigned employee's old rights;
                    //  - a password change did not end sessions opened with the old password.
                    List<Object[]> rows = userRepository.findAuthStateByEmail(userEmail);
                    if (rows.isEmpty()) {
                        filterChain.doFilter(request, response);
                        return;
                    }
                    Object[] state = rows.get(0);
                    String status = state[0] != null ? state[0].toString() : null;
                    if ("BANNED".equals(status) || "LOCKED".equals(status)) {
                        filterChain.doFilter(request, response);
                        return;
                    }
                    if (state[2] instanceof java.time.LocalDateTime changedAt) {
                        java.util.Date issuedAt = jwtService.extractIssuedAt(jwt);
                        long changedAtSeconds = changedAt.atZone(java.time.ZoneId.systemDefault()).toEpochSecond();
                        if (issuedAt == null || issuedAt.getTime() / 1000 < changedAtSeconds) {
                            filterChain.doFilter(request, response);
                            return;
                        }
                    }
                    // An account holding an admin-issued temporary password may only change it.
                    // The flag used to be stored and never checked, so the shared initial
                    // password stayed usable indefinitely.
                    if (Boolean.TRUE.equals(state[3]) && !isPasswordChangePath(request.getRequestURI())) {
                        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        response.setContentType("application/json");
                        response.setCharacterEncoding("UTF-8");
                        response.getWriter().write("{\"success\":false,\"code\":\"PASSWORD_CHANGE_REQUIRED\","
                                + "\"message\":\"Vui lòng đổi mật khẩu tạm thời trước khi tiếp tục.\",\"status\":403}");
                        return;
                    }
                    String role = state[1] != null ? state[1].toString() : "USER";
                    
                    List<GrantedAuthority> authorities = new ArrayList<>();
                    // Add standard role authority
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
                    
                    // Fine-grained permissions doc qua cache "role_permissions".
                    // Truoc day filter goi thang repository, tuc la MOI request da xac thuc phai
                    // chiu them mot round-trip toi Postgres (~200-500ms voi DB remote).
                    // The defaults are a bootstrap for a role that has never been
                    // configured, NOT a floor. Treating "no rows" as "use defaults"
                    // made revocation impossible: deleting a role's last permission
                    // silently restored the entire default set. A role that exists in
                    // role_permissions with zero rows has been deliberately emptied.
                    List<RolePermissionEntity> permissions = rolePermissionService.getPermissionsForRole(role);
                    List<String> permissionCodes;
                    if (!permissions.isEmpty()) {
                        permissionCodes = permissions.stream()
                                .map(RolePermissionEntity::getPermission)
                                .toList();
                    } else if (rolePermissionService.isRoleConfigured(role)) {
                        permissionCodes = List.of();
                    } else {
                        permissionCodes = DEFAULT_PERMISSIONS.getOrDefault(role, List.of());
                    }
                    for (String perm : permissionCodes) {
                        authorities.add(new SimpleGrantedAuthority(perm));
                    }

                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userEmail,
                            null,
                            authorities
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            // Invalid token
        }
        
        filterChain.doFilter(request, response);
    }
}
