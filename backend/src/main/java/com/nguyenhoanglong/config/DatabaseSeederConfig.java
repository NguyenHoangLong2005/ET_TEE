package com.nguyenhoanglong.config;

import com.nguyenhoanglong.service.DataSeederService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;

@Configuration
public class DatabaseSeederConfig {

    @Bean
    @ConditionalOnExpression("'${SEED_PRODUCTS:false}'.equals('true') || '${spring.profiles.active:none}'.contains('seed')")
    public CommandLineRunner initDatabase(DataSeederService dataSeederService) {
        return args -> {
            dataSeederService.seedProducts();
        };
    }
}
