package com.nguyenhoanglong.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

/** Serves uploaded product images from disk under /api/uploads/**. */
@Configuration
public class UploadConfig implements WebMvcConfigurer {

    private final Path uploadRoot;

    public UploadConfig(@Value("${app.upload-dir:./uploads}") String uploadDir) {
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public Path getUploadRoot() {
        return uploadRoot;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/api/uploads/**")
                .addResourceLocations(uploadRoot.toUri().toString())
                .setCacheControl(org.springframework.http.CacheControl
                        .maxAge(java.time.Duration.ofDays(30)).cachePublic());
    }
}
