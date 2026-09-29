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

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
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
                    "/api/orders/checkout",
                    "/health",
                    "/actuator/**"
                ).permitAll()
                
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
                .authenticationEntryPoint((request, response, authException) ->
                    writeError(response, HttpStatus.UNAUTHORIZED,
                            "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại."))
                .accessDeniedHandler((request, response, deniedException) ->
                    writeError(response, HttpStatus.FORBIDDEN,
                            "Bạn không có quyền thực hiện thao tác này."))
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
