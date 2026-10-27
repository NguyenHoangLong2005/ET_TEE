package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.Inventory;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** The restock quantity rule, without a database. Horizon = 7 lead + 14 cover + 7 safety = 28 days. */
class ReplenishmentAdvisorTest {

    private static Inventory inv(int onHand, int reserved, int reorder) {
        Inventory i = new Inventory();
        i.setProductId(1L);
        i.setProductName("Áo test");
        i.setQuantityOnHand(onHand);
        i.setQuantityReserved(reserved);
        i.setReorderLevel(reorder);
        return i;
    }

    @Test
    void fastSellerIsToppedUpToFourWeeksOfSales() {
        // 60 sold in 30 days = 2/day -> target 56; 8 on hand, 3 held -> 5 available
        var s = ReplenishmentAdvisor.suggestion(inv(8, 3, 10), 60);
        assertEquals("SALES", s.basis());
        assertEquals(2.0, s.dailyDemand());
        assertEquals(56, s.targetStock());
        assertEquals(51, s.suggestedQuantity());
        assertEquals(28, s.coverDays());
    }

    @Test
    void slowSellerStillEndsAboveItsReorderLevel() {
        // 3 sold = 0.1/day -> 2.8 days of stock would be 3 units, below the threshold of 10
        var s = ReplenishmentAdvisor.suggestion(inv(4, 0, 10), 3);
        assertEquals("SALES", s.basis());
        assertEquals(11, s.targetStock(), "reorder level + 1, so the item is not flagged again at once");
        assertEquals(7, s.suggestedQuantity());
    }

    @Test
    void noSalesFallsBackToTheThresholdRuleAndSaysSo() {
        var s = ReplenishmentAdvisor.suggestion(inv(5, 0, 10), 0);
        assertEquals("THRESHOLD", s.basis());
        assertEquals(0, s.coverDays());
        assertEquals(15, s.suggestedQuantity());
    }

    @Test
    void overReservedStockCountsAsEmpty() {
        // 2 on hand but 5 promised to orders: nothing usable, top up the whole target
        var s = ReplenishmentAdvisor.suggestion(inv(2, 5, 10), 60);
        assertEquals(-3, s.available());
        assertEquals(56, s.suggestedQuantity());
    }
}
