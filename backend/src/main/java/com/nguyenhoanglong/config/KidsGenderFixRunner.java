package com.nguyenhoanglong.config;

import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.logging.Logger;

@Component
public class KidsGenderFixRunner implements CommandLineRunner {

    private static final Logger log = Logger.getLogger(KidsGenderFixRunner.class.getName());

    private final ProductRepository productRepository;

    @Value("${app.datafix.kids-gender.enabled:false}")
    private boolean enabled;

    public KidsGenderFixRunner(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (!enabled) {
            log.info("KidsGenderFixRunner is disabled. Set app.datafix.kids-gender.enabled=true to run.");
            return;
        }

        log.info("Starting KidsGenderFixRunner...");
        
        List<Product> kidsProducts = productRepository.findAll().stream()
                .filter(p -> "kids".equalsIgnoreCase(p.getTargetGroup()))
                .filter(p -> p.getGender() == null || p.getGender().trim().isEmpty())
                .toList();
                
        int updatedBoyCount = 0;
        int updatedGirlCount = 0;
        int skippedCount = 0;

        for (Product p : kidsProducts) {
            String text = (p.getName() + " " + p.getSlug()).toLowerCase();
            
            if (text.contains("bé trai") || text.contains("be-trai")) {
                p.setGender("boy");
                updatedBoyCount++;
            } else if (text.contains("bé gái") || text.contains("be-gai") || text.contains("váy") || text.contains("vay") || text.contains("đầm") || text.contains("dam") || text.contains("elsa")) {
                p.setGender("girl");
                updatedGirlCount++;
            } else {
                skippedCount++;
            }
        }

        productRepository.saveAll(kidsProducts);

        log.info("KidsGenderFixRunner completed.");
        log.info("Updated Boy Count: " + updatedBoyCount);
        log.info("Updated Girl Count: " + updatedGirlCount);
        log.info("Skipped Count: " + skippedCount);
    }
}
