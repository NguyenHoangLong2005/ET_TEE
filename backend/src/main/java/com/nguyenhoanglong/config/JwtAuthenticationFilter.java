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
                    String status = userRepository.findStatusByEmail(userEmail).orElse(null);
                    if ("BANNED".equals(status) || "LOCKED".equals(status)) {
                        filterChain.doFilter(request, response);
                        return;
                    }
                    String role = jwtService.extractRole(jwt);
                    if (role == null) {
                        role = "USER";
                    }
                    
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
