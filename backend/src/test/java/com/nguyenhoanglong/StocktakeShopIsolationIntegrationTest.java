package com.nguyenhoanglong;

import com.nguyenhoanglong.entity.Stocktake;
import com.nguyenhoanglong.repository.StocktakeRepository;
import com.nguyenhoanglong.service.WarehouseService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class StocktakeShopIsolationIntegrationTest {

    @Autowired
    private WarehouseService warehouseService;

    @Autowired
    private StocktakeRepository stocktakeRepository;

    @Test
    @DisplayName("DB & Service: Stocktake queries are isolated strictly by shopId")
    public void testStocktakeShopIsolation() {
        stocktakeRepository.deleteAll();

        // Create stocktake for Shop 1
        Stocktake s1 = new Stocktake();
        s1.setWarehouseLocation("ZONE-A1");
        s1.setCreatedBy(100L);
        s1.setShopId(1L);
        s1.setStatus("IN_PROGRESS");
        stocktakeRepository.save(s1);

        // Create stocktake for Shop 2
        Stocktake s2 = new Stocktake();
        s2.setWarehouseLocation("ZONE-B2");
        s2.setCreatedBy(200L);
        s2.setShopId(2L);
        s2.setStatus("IN_PROGRESS");
        stocktakeRepository.save(s2);

        // Query for Shop 1
        List<Stocktake> shop1List = warehouseService.getStocktakes(1L);
        assertEquals(1, shop1List.size(), "Shop 1 should only see its own stocktake");
        assertEquals("ZONE-A1", shop1List.get(0).getWarehouseLocation());
        assertEquals(1L, shop1List.get(0).getShopId());

        // Query for Shop 2
        List<Stocktake> shop2List = warehouseService.getStocktakes(2L);
        assertEquals(1, shop2List.size(), "Shop 2 should only see its own stocktake");
        assertEquals("ZONE-B2", shop2List.get(0).getWarehouseLocation());
        assertEquals(2L, shop2List.get(0).getShopId());

        // Query for SuperAdmin / Unscoped (null shopId)
        List<Stocktake> allList = warehouseService.getStocktakes(null);
        assertEquals(2, allList.size(), "Unscoped query should return stocktakes from all shops");
    }
}
