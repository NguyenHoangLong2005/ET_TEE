package com.nguyenhoanglong.recsys;

import java.util.List;
import java.util.Map;

/**
 * The shop's published size charts - the same tables customers read on /size-guide
 * (web/src/app/size-guide/SizeGuideClient.tsx). Change one, change the other.
 *
 * Each measurement row is a [low, high] range per size (single published values such as shoulder
 * width are stored as value +/- 0.75 cm).
 */
public final class SizeCharts {

    public enum Measure { HEIGHT, WEIGHT, SHOULDER, CHEST, WAIST }

    public record Chart(String id, String label, List<String> sizes, Map<Measure, double[][]> ranges) {
        public double[] range(Measure m, int sizeIndex) {
            double[][] r = ranges.get(m);
            return r == null ? null : r[sizeIndex];
        }
    }

    private static double[][] r(double... bounds) {
        double[][] out = new double[bounds.length / 2][];
        for (int i = 0; i < out.length; i++) out[i] = new double[]{bounds[2 * i], bounds[2 * i + 1]};
        return out;
    }

    private static double[][] point(double tolerance, double... values) {
        double[][] out = new double[values.length][];
        for (int i = 0; i < values.length; i++) out[i] = new double[]{values[i] - tolerance, values[i] + tolerance};
        return out;
    }

    public static final Chart MEN_TOP = new Chart("MEN_TOP", "Áo nam",
            List.of("S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"),
            Map.of(Measure.HEIGHT, r(160, 165, 160, 165, 166, 172, 172, 177, 177, 184, 184, 192, 184, 192, 184, 192),
                    Measure.WEIGHT, r(50, 54, 55, 61, 62, 68, 69, 75, 76, 84, 85, 90, 90, 98, 99, 105),
                    Measure.SHOULDER, point(0.75, 41, 42, 43.5, 45, 46.5, 48, 49, 50),
                    Measure.CHEST, r(82, 86, 86, 90, 90, 94, 94, 98, 98, 103, 103, 108, 108, 113, 114, 120)));

    /** Published as waist sizes 29..34 = S..3XL; the catalogue sells trousers under the letter sizes. */
    public static final Chart MEN_BOTTOM = new Chart("MEN_BOTTOM", "Quần nam",
            List.of("S", "M", "L", "XL", "2XL", "3XL"),
            Map.of(Measure.HEIGHT, r(160, 165, 163, 168, 166, 172, 170, 176, 175, 182, 178, 186),
                    Measure.WEIGHT, r(52, 56, 57, 63, 64, 70, 71, 77, 78, 84, 85, 92),
                    Measure.WAIST, r(73, 75, 76, 78, 79, 81, 82, 84, 85, 88, 89, 92)));

    public static final Chart WOMEN = new Chart("WOMEN", "Nữ",
            List.of("S", "M", "L", "XL", "2XL"),
            Map.of(Measure.HEIGHT, r(150, 156, 156, 162, 162, 166, 165, 170, 168, 174),
                    Measure.WEIGHT, r(40, 47, 48, 53, 54, 59, 60, 65, 66, 72),
                    Measure.CHEST, r(80, 84, 84, 88, 88, 92, 92, 96, 96, 100),
                    Measure.WAIST, r(62, 66, 66, 70, 70, 74, 74, 78, 78, 82)));

    /**
     * Kids: the published table covers 100..150 (size = top of the height range). 90 and 160 exist in
     * the catalogue too; they are extended by the same rule (height N-10..N), without a weight range.
     */
    public static final Chart KIDS = new Chart("KIDS", "Trẻ em",
            List.of("90", "100", "110", "120", "130", "140", "150", "160"),
            Map.of(Measure.HEIGHT, r(80, 90, 90, 100, 100, 110, 110, 120, 120, 130, 130, 140, 140, 150, 150, 160),
                    Measure.WEIGHT, r(-1, -1, 12, 15, 15, 18, 18, 23, 23, 28, 28, 34, 34, 40, -1, -1)));

    public static final Map<String, Chart> BY_ID = Map.of(
            MEN_TOP.id(), MEN_TOP, MEN_BOTTOM.id(), MEN_BOTTOM, WOMEN.id(), WOMEN, KIDS.id(), KIDS);

    /** Chart for a product; null when sizes are not body-measurement based (accessories, shoes). */
    public static Chart forProduct(String targetGroup, String productType) {
        String g = targetGroup == null ? "" : targetGroup.toLowerCase();
        String t = productType == null ? "" : productType.toLowerCase();
        if (t.equals("accessories")) return null;
        if (g.equals("kids")) return KIDS;
        if (g.equals("women")) return WOMEN;
        // men, and unisex / family adult wear (cut on the men's block)
        return (t.equals("pants") || t.equals("shorts")) ? MEN_BOTTOM : MEN_TOP;
    }

    /** Catalogue label -> chart label ("XXL" is sold as XXL but published as 2XL). */
    public static String normalize(String size) {
        if (size == null) return null;
        String s = size.trim().toUpperCase();
        return switch (s) {
            case "XXL" -> "2XL";
            case "XXXL" -> "3XL";
            default -> s;
        };
    }

    private SizeCharts() {}
}
