package com.nguyenhoanglong.util;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Nguon duy nhat de anh xa mot ma hex mau sang mot ma mau (color_code) doc duoc.
 *
 * Dung mot bang tra cuu chinh xac cho cac hex da biet; hex la nao (chua co trong
 * bang) duoc gan vao mau CHUAN gan nhat bang khoang cach Euclid tren khong gian
 * RGB, co nguong: qua xa moi mau chuan thi tra ve rong thay vi doan bua. Nho vay
 * "cac ma hex gan nhau ra cung mot ma mau" ke ca khi du lieu tuong lai dung hex
 * hoi khac (vi du #FEFEFE thay vi #FFFFFF) van duoc gop vao "white".
 *
 * Bang nay lay tu file migration cu (V20260918000000__add_color_to_product_images_and_variants.sql),
 * giu nguyen 9 hex dang co trong du lieu that va them 2 hex file do khai bao san
 * (red, green) de dung sau nay du hien tai chua co du lieu nao mang chung.
 */
public final class ColorPalette {

    /** Mot mau chuan: ma mau doc duoc + toa do RGB tham chieu. */
    public record NamedColor(String code, int r, int g, int b) {}

    private static final Map<String, NamedColor> EXACT_HEX_TO_COLOR = new LinkedHashMap<>();
    private static final NamedColor[] PALETTE;

    static {
        register("#ffffff", "white", 0xFF, 0xFF, 0xFF);
        register("#111111", "black", 0x11, 0x11, 0x11);
        register("#9ca3af", "gray", 0x9C, 0xA3, 0xAF);
        register("#d6c3a5", "beige", 0xD6, 0xC3, 0xA5);
        register("#f3e5ab", "cream", 0xF3, 0xE5, 0xAB);
        register("#8b5a2b", "earth", 0x8B, 0x5A, 0x2B);
        register("#5f7a61", "graygreen", 0x5F, 0x7A, 0x61);
        register("#facc15", "yellow", 0xFA, 0xCC, 0x15);
        register("#dc2626", "red", 0xDC, 0x26, 0x26);
        register("#2563eb", "blue", 0x25, 0x63, 0xEB);
        register("#0f172a", "navy", 0x0F, 0x17, 0x2A);
        register("#3b5f8a", "denim", 0x3B, 0x5F, 0x8A);
        register("#f9a8d4", "pink", 0xF9, 0xA8, 0xD4);
        register("#16a34a", "green", 0x16, 0xA3, 0x4A);

        PALETTE = EXACT_HEX_TO_COLOR.values().toArray(new NamedColor[0]);
    }

    private static void register(String hex, String code, int r, int g, int b) {
        EXACT_HEX_TO_COLOR.put(hex, new NamedColor(code, r, g, b));
    }

    private ColorPalette() {
    }

    /**
     * Nguong khoang cach Euclid toi da (tren khong gian RGB 0-255 moi kenh) de
     * con chap nhan gan vao mau gan nhat. Vuot qua nguong nay nghia la hex khong
     * giong du mau nao trong bang -> tra ve rong, khong doan bua.
     */
    private static final double MAX_DISTANCE = 60.0;

    /**
     * Suy color_code tu mot ma hex.
     *
     * @return ma mau neu khop chinh xac hoac du gan mot mau chuan; rong neu hex
     *         khong parse duoc hoac qua xa moi mau chuan.
     */
    public static Optional<String> fromHex(String hex) {
        if (hex == null || hex.isBlank()) {
            return Optional.empty();
        }
        String normalized = hex.trim().toLowerCase();

        NamedColor exact = EXACT_HEX_TO_COLOR.get(normalized);
        if (exact != null) {
            return Optional.of(exact.code());
        }

        int[] rgb = parseHex(normalized);
        if (rgb == null) {
            return Optional.empty();
        }

        NamedColor nearest = null;
        double bestDistance = Double.MAX_VALUE;
        for (NamedColor candidate : PALETTE) {
            double distance = euclideanDistance(rgb[0], rgb[1], rgb[2], candidate.r(), candidate.g(), candidate.b());
            if (distance < bestDistance) {
                bestDistance = distance;
                nearest = candidate;
            }
        }
        if (nearest != null && bestDistance <= MAX_DISTANCE) {
            return Optional.of(nearest.code());
        }
        return Optional.empty();
    }

    private static int[] parseHex(String normalized) {
        String hex = normalized.startsWith("#") ? normalized.substring(1) : normalized;
        if (hex.length() != 6) {
            return null;
        }
        try {
            int r = Integer.parseInt(hex.substring(0, 2), 16);
            int g = Integer.parseInt(hex.substring(2, 4), 16);
            int b = Integer.parseInt(hex.substring(4, 6), 16);
            return new int[]{r, g, b};
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static double euclideanDistance(int r1, int g1, int b1, int r2, int g2, int b2) {
        double dr = r1 - r2;
        double dg = g1 - g2;
        double db = b1 - b2;
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }
}
