package com.nguyenhoanglong.service;

import com.nguyenhoanglong.recsys.SizeCharts;
import com.nguyenhoanglong.repository.ProductRepository;
import com.nguyenhoanglong.repository.UserMeasurementRepository;
import com.nguyenhoanglong.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static com.nguyenhoanglong.service.SizeAdvisorService.Confidence.*;
import static com.nguyenhoanglong.service.SizeAdvisorService.Fit.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

/** Expected sizes read straight off the published charts (/size-guide). */
class SizeAdvisorServiceTest {

    private final SizeAdvisorService service = new SizeAdvisorService(
            mock(ProductRepository.class), mock(UserRepository.class), mock(UserMeasurementRepository.class));

    private static SizeAdvisorService.Body body(Double h, Double w, Double chest, Double waist, SizeAdvisorService.Fit fit) {
        return new SizeAdvisorService.Body(h, w, chest, waist, null, fit);
    }

    private static Set<String> all(SizeCharts.Chart chart) {
        return new HashSet<>(chart.sizes());
    }

    @Test
    void menTop170cm65kgIsL() {
        var a = service.advise(SizeCharts.MEN_TOP, body(170.0, 65.0, null, null, REGULAR), all(SizeCharts.MEN_TOP));
        assertEquals("L", a.size());
        assertEquals(FITS, a.confidence());
        assertEquals("M", a.smaller());
        assertEquals("XL", a.larger());
        assertTrue(a.reasons().get(0).contains("nằm trong"));
    }

    @Test
    void loosePreferenceMovesUpOnlyWhenTheBiggerSizeStillNearlyFits() {
        // 172 cm / 68 kg: L fits exactly, XL misses weight by 1 kg -> loose goes XL
        assertEquals("XL", service.advise(SizeCharts.MEN_TOP, body(172.0, 68.0, null, null, LOOSE),
                all(SizeCharts.MEN_TOP)).size());
        // 170 cm / 65 kg: XL misses by 2 cm and 4 kg -> stays L even for loose
        assertEquals("L", service.advise(SizeCharts.MEN_TOP, body(170.0, 65.0, null, null, LOOSE),
                all(SizeCharts.MEN_TOP)).size());
    }

    @Test
    void circumferenceOutweighsWeight() {
        // women 160 cm / 52 kg is M, but a 91 cm chest is in L's 88-92 range
        var plain = service.advise(SizeCharts.WOMEN, body(160.0, 52.0, null, null, REGULAR), all(SizeCharts.WOMEN));
        var withChest = service.advise(SizeCharts.WOMEN, body(160.0, 52.0, 91.0, null, REGULAR), all(SizeCharts.WOMEN));
        assertEquals("M", plain.size());
        assertEquals("L", withChest.size());
        assertEquals(CLOSE, withChest.confidence());
    }

    @Test
    void outOfStockBestSizeFallsBackToTheNearestOneAndSaysSo() {
        var a = service.advise(SizeCharts.MEN_BOTTOM, body(168.0, 67.0, null, null, REGULAR), Set.of("S", "M", "XL"));
        assertEquals("L", a.bestSize());
        assertFalse(a.bestInStock());
        assertEquals("XL", a.size());               // regular fit: bigger first on equal distance
    }

    @Test
    void kidsNeedOnlyHeight() {
        var a = service.advise(SizeCharts.KIDS, body(125.0, null, null, null, null), all(SizeCharts.KIDS));
        assertEquals("130", a.size());
        assertEquals(FITS, a.confidence());
    }

    @Test
    void farOutsideTheChartIsFlagged() {
        var a = service.advise(SizeCharts.WOMEN, body(185.0, 95.0, null, null, REGULAR), all(SizeCharts.WOMEN));
        assertEquals("2XL", a.size());
        assertEquals(OUTSIDE_CHART, a.confidence());
    }

    @Test
    void chartSelectionAndLabels() {
        assertSame(SizeCharts.MEN_BOTTOM, SizeCharts.forProduct("men", "shorts"));
        assertSame(SizeCharts.WOMEN, SizeCharts.forProduct("women", "pants"));
        assertSame(SizeCharts.KIDS, SizeCharts.forProduct("kids", "tshirt"));
        assertSame(SizeCharts.MEN_TOP, SizeCharts.forProduct("family", "tshirt"));
        assertNull(SizeCharts.forProduct("accessories", "accessories"));
        assertEquals("2XL", SizeCharts.normalize("xxl"));
    }

    @Test
    void missingBasicsAsksForMeasurements() {
        assertEquals("NEED_MEASUREMENTS", service.forChart("MEN_TOP", body(170.0, null, null, null, null)).reason());
        assertEquals("NO_CHART", service.forChart("SHOES", body(170.0, 60.0, null, null, null)).reason());
    }
}
