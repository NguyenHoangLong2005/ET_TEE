package com.nguyenhoanglong.config;

import com.nguyenhoanglong.repository.OrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Fix order shop assignment
 * Ensures all orders have shop_id set for proper staff order visibility
 */
@Component
public class OrderShopIdFixer implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(OrderShopIdFixer.class);
    
    private final OrderRepository orderRepository;
    
    public OrderShopIdFixer(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
    
    @Override
    @Transactional
    public void run(String... args) {
        try {
            // Count orders without shop_id
            Long countWithoutShop = orderRepository.countOrdersWithoutShopId();
            if (countWithoutShop > 0) {
                log.info("Found {} orders without shop_id, backfilling with shop_id = 1", countWithoutShop);
                orderRepository.backfillShopId(1L);
                log.info("Backfill completed successfully");
            } else {
                log.info("All orders already have shop_id assigned");
            }
        } catch (Exception e) {
            log.warn("Order shop_id backfill skipped: {}", e.getMessage());
        }
    }
}
