package com.nguyenhoanglong.config;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Security Configuration for ET.TEE Shop
 * Implements RBAC, CORS, JWT, and security headers
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final org.springframework.beans.factory.ObjectProvider<com.nguyenhoanglong.service.ActivityLogService> activityLogService;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                          org.springframework.beans.factory.ObjectProvider<com.nguyenhoanglong.service.ActivityLogService> activityLogService) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.activityLogService = activityLogService;
    }

    /**
     * Security-relevant refusals are part of the audit trail. 401s from anonymous visitors on
     * customer endpoints are ignored (pure noise); anything on the admin/staff/store-owner
     * areas, and every 403, is recorded.
     */
    private void auditDenied(jakarta.servlet.http.HttpServletRequest request, HttpStatus status) {
        try {
            String path = request.getRequestURI();
            boolean staffArea = path.startsWith("/api/admin/") || path.startsWith("/api/staff/") || path.startsWith("/api/store-owner/");
            if (!staffArea && status != HttpStatus.FORBIDDEN) return;
            var service = activityLogService.getIfAvailable();
            if (service == null) return;
            var entry = new com.nguyenhoanglong.entity.ActivityLog();
            entry.setAction("ACCESS_DENIED");
            entry.setTargetEntity("api");
            entry.setHttpMethod(request.getMethod());
            entry.setRequestPath(com.nguyenhoanglong.service.ActivityLogService.truncate(path, 500));
            entry.setStatusCode(status.value());
            entry.setResult(com.nguyenhoanglong.service.ActivityLogService.RESULT_FAILURE);
            entry.setIpAddress(com.nguyenhoanglong.util.ClientIpResolver.resolve(request));
            entry.setUserAgent(com.nguyenhoanglong.service.ActivityLogService.truncate(request.getHeader("User-Agent"), 500));
            entry.setDescription("Bị từ chối truy cập (" + status.value() + "): " + request.getMethod() + " " + path);
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            entry.setUserId(auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName()) ? auth.getName() : "ANONYMOUS");
            service.recordAsync(entry);
        } catch (Exception ignored) {
            // auditing must never change the security response
        }
    }

    @Bean
    @Order(1)
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            // Disable CSRF for REST API
            .csrf(csrf -> csrf.disable())

            
            // Session management - stateless for JWT
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // Authorization rules
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers(
                    "/api/auth/**",
                    "/api/public/**",
                    "/api/products/**",
                    "/api/categories/**",
                    "/api/customer/products/**",
                    "/api/customer/categories/**",
                    "/api/customer/banners/**",
                    "/api/customer/vouchers/**",
                    "/api/marketing/banners/**",
                    "/api/marketing/vouchers",
                    "/api/marketing/vouchers/validate",
                    "/api/marketing/trending",
                    "/api/marketing/public/**",
                    "/api/shops/active",
                    "/api/cart/**",
                    // Like the cart, the wishlist works for guests via X-Guest-Cart-Token
                    // (WishlistController / mergeGuestWishlistToUser); it was blocked here, so
                    // a guest's heart button always failed with 401.
                    "/api/wishlist/**",
                    "/api/orders/checkout",
                    // Bank account / QR details shown to customers at checkout and on the
                    // order-success page (guests included). Not secret.
                    "/api/payment-methods/**",
                    // 1x1 image in order emails (open tracking); fetched by mail clients
                    "/api/track/**",
                    // storefront VIEW beacon (guests included); BehaviorEventController
                    "/api/events",
                    // personalised home feed for guests too (keyed by the guest token); RecommendationController
                    "/api/recommendations/**",
                    // Sprint 5 search by phrase / photo; SearchController
                    "/api/search/**",
                    // uploaded product images shown on the storefront (read-only static files)
                    "/api/uploads/**",
                    "/health",
                    "/actuator/**"
                ).permitAll()

                // Published news posts for the storefront /news pages (MarketingController filters
                // to PUBLISHED). Not listed above, so customers got 401 and never saw a real post.
                .requestMatchers(org.springframework.http.HttpMethod.GET,
                    "/api/marketing/posts", "/api/marketing/posts/*").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/marketing/posts/*/view").permitAll()

                // Order lookup by code: guests (X-Guest-Cart-Token) must reach it after
                // checkout. OrderService.getOrderDetails enforces ownership (owner user or
                // matching guest token) and answers 403 otherwise; /me answers 401 itself.
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/orders/*").permitAll()
                // Same ownership rule for the guest's own cancel / return request.
                .requestMatchers(org.springframework.http.HttpMethod.POST,
                        "/api/orders/*/cancel", "/api/orders/*/return-request",
                        // PayOS: guests pay too; OrderService.getOwnedOrder enforces ownership.
                        "/api/orders/*/payos-link", "/api/orders/*/payos-sync").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/orders/*/payment").permitAll()
                
                // Staff endpoints require authentication
                .requestMatchers("/api/staff/**").authenticated()
                
                // Admin endpoints require ADMIN role
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                
                // All other requests require authentication
                .anyRequest().authenticated()
            )
            
            // Without an explicit entry point Spring answers every unauthenticated
            // request with 403, so the client cannot tell "session expired" from
            // "not allowed". A stateless JSON API must answer 401 in the first case.
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    auditDenied(request, HttpStatus.UNAUTHORIZED);
                    writeError(response, HttpStatus.UNAUTHORIZED,
                            "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.");
                })
                .accessDeniedHandler((request, response, deniedException) -> {
                    auditDenied(request, HttpStatus.FORBIDDEN);
                    writeError(response, HttpStatus.FORBIDDEN,
                            "Bạn không có quyền thực hiện thao tác này.");
                })
            )

            // Add JWT filter before UsernamePasswordAuthenticationFilter
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            
            // Security headers
            .headers(headers -> headers
                .frameOptions(frame -> frame.deny()) // Prevent clickjacking
                .contentTypeOptions(content -> {}) // Disable MIME sniffing
                .cacheControl(cache -> {}) // Cache control
            );

        return http.build();
    }

    /** Same envelope the rest of the API uses, so the client parses errors uniformly. */
    private static void writeError(HttpServletResponse response, HttpStatus status, String message)
            throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(
                "{\"success\":false,\"message\":\"" + message + "\",\"status\":" + status.value() + "}");
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        // BCrypt with strength 12 (default)
        return new BCryptPasswordEncoder(12);
    }
}
