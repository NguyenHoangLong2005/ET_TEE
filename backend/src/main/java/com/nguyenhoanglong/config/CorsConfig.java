package com.nguyenhoanglong.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.http.HttpHeaders;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * CORS Configuration for ET.TEE Shop
 */
@Configuration
public class CorsConfig {

    private static final List<String> DEV_ORIGINS = Arrays.asList(
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001"
    );

    /**
     * The deployed site's origin (FRONTEND_URL) must be allowed too: Next proxies /api/** to this
     * backend, so the browser's Origin header no longer matches the request host and every POST
     * is treated as cross-origin.
     */
    @Bean
    public CorsFilter corsFilter(@Value("${app.frontend-url:http://localhost:3000}") String frontendUrl) {
        List<String> allowedOrigins = new ArrayList<>(DEV_ORIGINS);
        String origin = frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;
        if (!allowedOrigins.contains(origin)) allowedOrigins.add(origin);

        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedOriginPatterns(allowedOrigins);
        config.setAllowedHeaders(Arrays.asList(
                HttpHeaders.ORIGIN,
                HttpHeaders.CONTENT_TYPE,
                HttpHeaders.ACCEPT,
                HttpHeaders.AUTHORIZATION,
                "X-Guest-Cart-Token",
                "X-Behavior-Session",
                "X-Shop-Id"
        ));
        config.setExposedHeaders(Arrays.asList(
                HttpHeaders.ORIGIN,
                "X-Total-Count",
                "X-Total-Pages"
        ));
        config.setAllowedMethods(Arrays.asList(
                "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
        ));
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
