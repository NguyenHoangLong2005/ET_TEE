package com.nguyenhoanglong.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/register", "/api/auth/login", "/api/auth/verify-email", "/api/auth/resend-code",
                                 "/api/auth/forgot-password", "/api/auth/reset-password", "/api/auth/resend-password-reset-code").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/products/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/products/*/reviews").permitAll()
                .requestMatchers("/api/cart/**").permitAll()
                .requestMatchers("/api/wishlist/**").permitAll()
                .requestMatchers("/api/orders/checkout").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/orders/{orderCode}").permitAll()
                .requestMatchers("/api/payment-methods/**").permitAll()
                // Marketing public
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/marketing/banners").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/marketing/banners/{position}").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/marketing/vouchers").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/marketing/vouchers/validate").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/marketing/public/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/marketing/public/**").permitAll()
                // Marketing staff/admin
                .requestMatchers("/api/marketing/admin/**").hasAnyRole("MARKETING_STAFF", "STAFF", "ADMIN")
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/staff/**").hasAnyRole("STAFF", "ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/products/**").hasAnyRole("STAFF", "ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/products/**").hasAnyRole("STAFF", "ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/products/**").hasAnyRole("STAFF", "ADMIN")
                .requestMatchers("/api/auth/me", "/api/auth/logout").authenticated()
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("http://localhost:*", "http://127.0.0.1:*", "http://10.0.2.2:*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
