package com.nguyenhoanglong;

import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import com.nguyenhoanglong.service.MarketingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
public class VoucherConcurrencyIntegrationTest {

    @Autowired
    private MarketingService marketingService;

    @Autowired
    private VoucherRepository voucherRepository;

    @Autowired
    private VoucherRedemptionRepository voucherRedemptionRepository;

    @Test
    @DisplayName("MKT-CONC-001: Concurrent redemptions on limited voucher cannot exceed maxUsage")
    public void testConcurrentVoucherRedemptions() throws InterruptedException {
        String code = "CONCUR-" + System.currentTimeMillis();
        Voucher voucher = new Voucher();
        voucher.setCode(code);
        voucher.setName("Limited Voucher");
        voucher.setType("FIXED_AMOUNT");
        voucher.setDiscountValue(new BigDecimal("50000.00"));
        voucher.setMinOrderAmount(new BigDecimal("100000.00"));
        voucher.setMaxUses(3); // only 3 allowed!
        voucher.setUsedCount(0);
        voucher.setStartDate(LocalDateTime.now().minusDays(1));
        voucher.setEndDate(LocalDateTime.now().plusDays(10));
        voucher.setStatus("ACTIVE");

        Voucher savedVoucher = voucherRepository.save(voucher);

        int totalThreads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(totalThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch endLatch = new CountDownLatch(totalThreads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);
        List<String> failReasons = new CopyOnWriteArrayList<>();

        for (int i = 0; i < totalThreads; i++) {
            final int customerIdx = i;
            executor.submit(() -> {
                try {
                    startLatch.await(); // ensure all threads blast simultaneously
                    // Validate voucher
                    Voucher v = marketingService.validateVoucher(code, new BigDecimal("200000.00"), "cust_" + customerIdx + "@test.com", false);
                    // Increment atomically
                    marketingService.incrementVoucherUsage(
                            v,
                            "cust_" + customerIdx + "@test.com",
                            "ORD-" + customerIdx,
                            new BigDecimal("200000.00"),
                            new BigDecimal("50000.00")
                    );
                    successCount.incrementAndGet();
                } catch (ResponseStatusException ex) {
                    failCount.incrementAndGet();
                    failReasons.add(ex.getReason());
                } catch (Exception ex) {
                    failCount.incrementAndGet();
                    failReasons.add(ex.getMessage());
                } finally {
                    endLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean completed = endLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(completed, "All threads should complete within 10 seconds");
        assertEquals(3, successCount.get(), "Exactly 3 redemptions should succeed");
        assertEquals(7, failCount.get(), "Exactly 7 redemptions should fail");

        // Verify database state
        Voucher updatedVoucher = voucherRepository.findByCode(code).orElseThrow();
        assertEquals(3, updatedVoucher.getUsedCount(), "Voucher usedCount must be exactly 3");

        long redemptionsCount = voucherRedemptionRepository.countByVoucherId(updatedVoucher.getId());
        assertEquals(3, redemptionsCount, "Exactly 3 redemption records must exist");
    }
}
