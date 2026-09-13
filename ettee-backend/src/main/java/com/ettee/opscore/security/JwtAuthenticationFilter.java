package com.ettee.opscore.security;

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
import java.util.List;
import java.util.stream.Stream;

/**
 * Xác thực mọi request bằng JWT trong header Authorization: Bearer <token>.
 * Authorities lấy trực tiếp từ claim trong token (đã nạp sẵn khi login) để tránh
 * query DB lại role/permission trên MỖI request — đổi lại: đổi quyền chỉ có hiệu lực
 * ở lần đăng nhập / refresh token kế tiếp (chấp nhận được cho hệ thống nội bộ).
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7);

        if (jwtService.isValid(token) && SecurityContextHolder.getContext().getAuthentication() == null) {
            String username = jwtService.extractUsername(token);
            List<String> roles = jwtService.extractRoles(token);
            List<String> perms = jwtService.extractPermissions(token);

            List<? extends GrantedAuthority> authorities = Stream.concat(
                    roles.stream().map(r -> new SimpleGrantedAuthority("ROLE_" + r.toUpperCase())),
                    perms.stream().map(SimpleGrantedAuthority::new)
            ).toList();

            var authToken = new UsernamePasswordAuthenticationToken(
                    new JwtPrincipal(jwtService.extractUserId(token), username), null, authorities
            );
            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authToken);
        }

        filterChain.doFilter(request, response);
    }
}