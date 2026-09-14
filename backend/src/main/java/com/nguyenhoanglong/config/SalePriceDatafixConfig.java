package com.nguyenhoanglong.config;

import com.nguyenhoanglong.service.SalePriceDatafixService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Phase B datafix runner. Renders a Markdown report describing every product
 * whose salePrice was rewritten to satisfy salePrice &lt; price.
 *
 * <p>Guarded by {@code app.datafix.saleprice.enabled} (default false). The
 * runner is idempotent: any product that already has a valid salePrice (lower
 * than price) is skipped, so re-runs are safe. The flag must be set explicitly
 * to {@code true} to opt-in.</p>
 */
@Configuration
public class SalePriceDatafixConfig {

    private static final Logger log = LoggerFactory.getLogger(SalePriceDatafixConfig.class);

    @Bean
    @ConditionalOnProperty(prefix = "app.datafix.saleprice", name = "enabled", havingValue = "true")
    public CommandLineRunner runSalePriceDatafix(SalePriceDatafixService service) {
        return args -> {
            log.info("Phase B datafix: app.datafix.saleprice.enabled=true — running salePrice datafix");
            SalePriceDatafixService.DatafixReport report = service.run();
            log.info("Phase B datafix: updated {} products. Report at {}",
                    report.totalUpdated(), report.reportPath());
        };
    }
}
