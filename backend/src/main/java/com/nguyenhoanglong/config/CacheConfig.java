package com.nguyenhoanglong.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Caching Configuration
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        ConcurrentMapCacheManager cacheManager = new ConcurrentMapCacheManager();
        
        // Define cache names
        cacheManager.setCacheNames(java.util.Arrays.asList(
            "products",      // Product catalog
            "categories",    // Category tree
            "banners",      // Marketing banners
            "vouchers",     // Active vouchers
            "placements",   // Product placements
            "config",            // System configuration
            "role_permissions",  // RBAC role-permission mappings
            "role_configured"    // Whether a role row exists (defaults vs deliberate empty set)
        ));
        
        return cacheManager;
    }
}
