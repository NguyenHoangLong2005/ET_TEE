package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.entity.ProductVariant;
import com.nguyenhoanglong.entity.UserMeasurement;
import com.nguyenhoanglong.exception.ResourceNotFoundException;
import com.nguyenhoanglong.recsys.SizeCharts;
import com.nguyenhoanglong.recsys.SizeCharts.Chart;
import com.nguyenhoanglong.recsys.SizeCharts.Measure;
import com.nguyenhoanglong.repository.ProductRepository;
import com.nguyenhoanglong.repository.UserMeasurementRepository;
import com.nguyenhoanglong.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Sprint 6 size advice. Deliberately NOT a learned model: there is no data to learn from yet
 * (user_measurements is empty, synthetic order sizes are random, no size-related returns), so it
 * matches the shopper's measurements against the shop's published size charts ({@link SizeCharts}):
 *
 *   miss(size) = sum over given measurements of  weight_m * distance outside the size's range / scale_m
 *
 * The size with the smallest miss wins (ties: closest to the middle of the ranges). A SLIM / LOOSE fit
 * preference moves one size down / up when that size misses by at most {@link #FIT_SHIFT_TOLERANCE}.
 * Only sizes the product actually has in stock are suggested.
 */
@Service
public class SizeAdvisorService {

    public enum Fit { SLIM, REGULAR, LOOSE }

    public enum Confidence { FITS, CLOSE, OUTSIDE_CHART }

    public record Body(Double heightCm, Double weightKg, Double chestCm, Double waistCm, Double shoulderCm, Fit fit) {
        boolean hasBasics(Chart chart) {
            return heightCm != null && (weightKg != null || chart == SizeCharts.KIDS);
        }
    }

    /** size = null with reason NEED_MEASUREMENTS / NO_CHART / NO_STOCK. */
    public record Advice(String size, Confidence confidence, String chart, String smaller, String larger,
                         boolean bestInStock, String bestSize, List<String> reasons, String source, String reason) {
        static Advice none(String chart, String reason) {
            return new Advice(null, null, chart, null, null, false, null, List.of(), null, reason);
        }
    }

    static final double FIT_SHIFT_TOLERANCE = 1.0;
    private static final Map<Measure, Double> SCALE = Map.of(Measure.HEIGHT, 5.0, Measure.WEIGHT, 5.0,
            Measure.CHEST, 4.0, Measure.WAIST, 4.0, Measure.SHOULDER, 1.5);
    private static final Map<Measure, Double> WEIGHT = Map.of(Measure.HEIGHT, 1.0, Measure.WEIGHT, 1.5,
            Measure.CHEST, 2.0, Measure.WAIST, 2.0, Measure.SHOULDER, 1.0);
    private static final Map<Measure, String> LABEL = Map.of(Measure.HEIGHT, "Chiều cao", Measure.WEIGHT, "Cân nặng",
            Measure.CHEST, "Vòng ngực", Measure.WAIST, "Vòng eo", Measure.SHOULDER, "Rộng vai");
    private static final Map<Measure, String> UNIT = Map.of(Measure.HEIGHT, "cm", Measure.WEIGHT, "kg",
            Measure.CHEST, "cm", Measure.WAIST, "cm", Measure.SHOULDER, "cm");

    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final UserMeasurementRepository measurementRepository;

    public SizeAdvisorService(ProductRepository productRepository, UserRepository userRepository,
                              UserMeasurementRepository measurementRepository) {
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.measurementRepository = measurementRepository;
    }

    /** Body from the request, or else the signed-in shopper's saved measurements. */
    @Transactional(readOnly = true)
    public Advice forProduct(String slug, Body given, String userEmail) {
        Product product = productRepository.findBySlug(slug)
                .filter(p -> "ACTIVE".equals(p.getStatus()))
                .orElseThrow(() -> new ResourceNotFoundException("Product", "slug", slug));
        Chart chart = SizeCharts.forProduct(product.getTargetGroup(), product.getProductType());
        if (chart == null) return Advice.none(null, "NO_CHART");

        Body body = given;
        String source = "INPUT";
        if ((body == null || !body.hasBasics(chart)) && userEmail != null) {
            body = fromProfile(userEmail, chart);
            source = "PROFILE";
        }
        if (body == null || !body.hasBasics(chart)) return Advice.none(chart.id(), "NEED_MEASUREMENTS");

        Set<String> inStock = new HashSet<>();
        for (ProductVariant v : product.getVariants()) {
            if (v.getSize() != null && v.getAvailableQuantity() != null && v.getAvailableQuantity() > 0) {
                inStock.add(SizeCharts.normalize(v.getSize()));
            }
        }
        Advice advice = advise(chart, body, inStock);
        return new Advice(advice.size(), advice.confidence(), advice.chart(), advice.smaller(), advice.larger(),
                advice.bestInStock(), advice.bestSize(), advice.reasons(), source, advice.reason());
    }

    /** Chart only (the /size-guide calculator): every size counts as available. */
    public Advice forChart(String chartId, Body body) {
        Chart chart = SizeCharts.BY_ID.get(chartId);
        if (chart == null) return Advice.none(chartId, "NO_CHART");
        if (body == null || !body.hasBasics(chart)) return Advice.none(chart.id(), "NEED_MEASUREMENTS");
        return advise(chart, body, new HashSet<>(chart.sizes()));
    }

    Advice advise(Chart chart, Body body, Set<String> inStock) {
        int n = chart.sizes().size();
        double[] miss = new double[n];
        double[] offCentre = new double[n];
        for (int i = 0; i < n; i++) {
            for (Measure m : Measure.values()) {
                Double x = valueOf(body, m);
                double[] range = chart.range(m, i);
                if (x == null || range == null || range[0] < 0) continue;
                double scale = SCALE.get(m);
                double outside = x < range[0] ? range[0] - x : x > range[1] ? x - range[1] : 0;
                miss[i] += WEIGHT.get(m) * outside / scale;
                offCentre[i] += Math.abs(x - (range[0] + range[1]) / 2) / scale;
            }
        }
        int best = 0;
        for (int i = 1; i < n; i++) {
            if (miss[i] < miss[best] - 1e-9 || (Math.abs(miss[i] - miss[best]) < 1e-9 && offCentre[i] < offCentre[best])) {
                best = i;
            }
        }
        Fit fit = body.fit() == null ? Fit.REGULAR : body.fit();
        int chosen = best;
        if (fit == Fit.SLIM && best > 0 && miss[best - 1] <= miss[best] + FIT_SHIFT_TOLERANCE) chosen = best - 1;
        if (fit == Fit.LOOSE && best < n - 1 && miss[best + 1] <= miss[best] + FIT_SHIFT_TOLERANCE) chosen = best + 1;

        // nearest size in stock, preferring the fit direction on equal distance
        int pick = -1;
        for (int d = 0; d < n && pick < 0; d++) {
            int[] order = fit == Fit.SLIM ? new int[]{chosen - d, chosen + d} : new int[]{chosen + d, chosen - d};
            if (d == 0) order = new int[]{chosen};
            for (int i : order) {
                if (i >= 0 && i < n && inStock.contains(chart.sizes().get(i))) {
                    pick = i;
                    break;
                }
            }
        }
        if (pick < 0) return Advice.none(chart.id(), "NO_STOCK");

        Confidence confidence = miss[pick] < 1e-9 ? Confidence.FITS
                : miss[pick] <= 1.5 ? Confidence.CLOSE : Confidence.OUTSIDE_CHART;
        String smaller = pick > 0 && inStock.contains(chart.sizes().get(pick - 1)) ? chart.sizes().get(pick - 1) : null;
        String larger = pick < n - 1 && inStock.contains(chart.sizes().get(pick + 1)) ? chart.sizes().get(pick + 1) : null;
        return new Advice(chart.sizes().get(pick), confidence, chart.id(), smaller, larger, pick == chosen,
                chart.sizes().get(chosen), reasons(chart, body, pick, fit, chosen != best), null, null);
    }

    private static List<String> reasons(Chart chart, Body body, int i, Fit fit, boolean shifted) {
        List<String> out = new ArrayList<>();
        String size = chart.sizes().get(i);
        for (Measure m : Measure.values()) {
            Double x = valueOf(body, m);
            double[] range = chart.range(m, i);
            if (x == null || range == null || range[0] < 0) continue;
            String r = fmt(range[0]) + "–" + fmt(range[1]) + " " + UNIT.get(m);
            boolean inside = x >= range[0] && x <= range[1];
            out.add(LABEL.get(m) + " " + fmt(x) + " " + UNIT.get(m) + (inside ? " nằm trong " : " ngoài ")
                    + "khoảng size " + size + " (" + r + ")");
        }
        if (shifted) {
            out.add(fit == Fit.SLIM ? "Lùi một size vì bạn thích mặc ôm" : "Lên một size vì bạn thích mặc rộng");
        }
        return out;
    }

    private static String fmt(double v) {
        return v == Math.rint(v) ? String.valueOf((long) v) : String.valueOf(v);
    }

    private static Double valueOf(Body b, Measure m) {
        return switch (m) {
            case HEIGHT -> b.heightCm();
            case WEIGHT -> b.weightKg();
            case CHEST -> b.chestCm();
            case WAIST -> b.waistCm();
            case SHOULDER -> b.shoulderCm();
        };
    }

    private Body fromProfile(String email, Chart chart) {
        return userRepository.findByEmail(email)
                .flatMap(u -> measurementRepository.findByUserId(u.getId()))
                // a CHILD profile is for kids' sizes, an adult one for adult sizes
                .filter(m -> (chart == SizeCharts.KIDS) == "CHILD".equals(m.getMeasurementProfileType()))
                .map(SizeAdvisorService::toBody)
                .orElse(null);
    }

    static Body toBody(UserMeasurement m) {
        Fit fit = null;
        if (m.getFitPreference() != null) {
            try {
                fit = Fit.valueOf(m.getFitPreference().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                // unknown value: regular
            }
        }
        return new Body(d(m.getHeightCm()), d(m.getWeightKg()), d(m.getChestCm()), d(m.getWaistCm()),
                d(m.getShoulderCm()), fit);
    }

    private static Double d(Float f) {
        return f == null || f <= 0 ? null : f.doubleValue();
    }
}
