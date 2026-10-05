package com.nguyenhoanglong.util;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Phan nhom size cho bo loc sidebar.
 *
 * Du lieu crawl tron nhieu loai size vao cung cot variant.size: size chu (S, M, L),
 * bien the hiem (S+, M-, XXL+), size eo quan (29-36), size tat/giay (35-38, 39-42),
 * chieu cao tre em (90-160) va do tuoi ("4-6 tuoi"). Truoc day chi chia theo
 * targetGroup nen moi thu don vao nhom "Nguoi lon". Lop nay phan loai theo ca
 * targetGroup lan productType va sap xep moi nhom theo thu tu tu nhien.
 */
public final class SizeGroups {

    public static final String LETTER = "letter";
    public static final String NUMBER = "number";
    public static final String ACCESSORY = "accessory";
    public static final String KIDS = "kids";

    private static final List<String> LETTER_ORDER =
            List.of("XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL");
    private static final Set<String> KIDS_GROUPS = Set.of("kids", "baby", "boys", "girls");
    private static final Pattern LETTER_WITH_SUFFIX = Pattern.compile("^(XXS|XS|S|M|L|XL|XXL|3XL|4XL|5XL)[+-]$");
    private static final Pattern AGE = Pattern.compile("(?i).*tu[oổ]i.*");
    private static final Pattern LEADING_NUMBER = Pattern.compile("^(\\d+)");
    private static final Pattern NUMBER_RANGE = Pattern.compile("^(\\d+)-(\\d+)$");
    /** Do rong toi da cua mot khoang size tat ("35-38") khi tim nguoc tu mot size don. */
    private static final int MAX_RANGE_SPAN = 6;

    private SizeGroups() {}

    /** Size chu goc cua mot bien the: "S+" -> "S", "XXL-" -> "XXL"; khong phai bien the thi giu nguyen. */
    public static String baseLetter(String size) {
        Matcher m = LETTER_WITH_SUFFIX.matcher(size);
        return m.matches() ? m.group(1) : size;
    }

    /** Mot size chu goc kem cac bien the +/- de loc: "S" -> [S, S+, S-]. */
    public static List<String> expandForFilter(String size) {
        String s = size.trim();
        if (LETTER_ORDER.contains(s)) return List.of(s, s + "+", s + "-");
        return List.of(s);
    }

    /**
     * Size tat/giay de loc: mot size don N khop ca N lan moi khoang "a-b" chua N
     * (36 -> 36, 35-38, 33-36, ...). Size tat luu dang khoang, size giay luu dang so
     * don; sidebar chi hien so don nen phai tim nguoc ra cac khoang chua no.
     */
    public static List<String> expandAccessoryForFilter(String size) {
        String s = size.trim();
        if (!s.matches("\\d+")) return expandForFilter(s);
        int n = Integer.parseInt(s);
        List<String> out = new ArrayList<>();
        out.add(s);
        for (int a = n - MAX_RANGE_SPAN; a <= n; a++) {
            for (int b = Math.max(n, a + 1); b <= a + MAX_RANGE_SPAN; b++) {
                out.add(a + "-" + b);
            }
        }
        return out;
    }

    /**
     * Nhom cac bo (size, targetGroup, productType) thanh 4 nhom co thu tu:
     * letter, number (eo quan / size so), accessory (tat, giay), kids (chieu cao, do tuoi).
     */
    public static Map<String, List<String>> group(Collection<Object[]> rows) {
        Set<String> letter = new LinkedHashSet<>();
        Set<String> number = new LinkedHashSet<>();
        Set<String> accessory = new LinkedHashSet<>();
        Set<String> kids = new LinkedHashSet<>();

        for (Object[] row : rows) {
            String size = row[0] == null ? "" : ((String) row[0]).trim();
            String targetGroup = (String) row[1];
            String productType = row.length > 2 ? (String) row[2] : null;
            if (size.isEmpty() || "One Size".equalsIgnoreCase(size)) continue;

            String base = baseLetter(size);
            if (LETTER_ORDER.contains(base)) {
                // Size chu cua tre em (S/M/L) trung voi nguoi lon, gop chung mot nhom
                letter.add(base);
            } else if (AGE.matcher(size).matches()
                    || (targetGroup != null && KIDS_GROUPS.contains(targetGroup))) {
                kids.add(size);
            } else if ("accessories".equals(productType) || "accessories".equals(targetGroup)) {
                // Tach khoang "35-38" thanh 35, 36, 37, 38 de cac nut khong bao ham nhau
                Matcher range = NUMBER_RANGE.matcher(size);
                if (range.matches()) {
                    int from = Integer.parseInt(range.group(1));
                    int to = Integer.parseInt(range.group(2));
                    for (int i = from; i <= to && to - from <= MAX_RANGE_SPAN; i++) accessory.add(String.valueOf(i));
                    if (to - from > MAX_RANGE_SPAN) accessory.add(size);
                } else {
                    accessory.add(size);
                }
            } else {
                number.add(size);
            }
        }

        Map<String, List<String>> out = new LinkedHashMap<>();
        out.put(LETTER, sorted(letter, Comparator.comparingInt(LETTER_ORDER::indexOf)));
        out.put(NUMBER, sorted(number, numericFirst()));
        out.put(ACCESSORY, sorted(accessory, numericFirst()));
        // Chieu cao (90..160) truoc, roi den do tuoi (4-6 tuoi, 6-8 tuoi, ...)
        out.put(KIDS, sorted(kids, Comparator
                .comparing((String s) -> AGE.matcher(s).matches())
                .thenComparing(numericFirst())));
        return out;
    }

    private static List<String> sorted(Set<String> values, Comparator<String> order) {
        List<String> list = new ArrayList<>(values);
        list.sort(order);
        return list;
    }

    /** So dau tien trong chuoi ("39-42" -> 39), roi do dai (35 truoc 35-38), roi chu cai. */
    private static Comparator<String> numericFirst() {
        return Comparator
                .comparingInt((String s) -> {
                    Matcher m = LEADING_NUMBER.matcher(s);
                    return m.find() ? Integer.parseInt(m.group(1)) : Integer.MAX_VALUE;
                })
                .thenComparingInt(String::length)
                .thenComparing(Comparator.naturalOrder());
    }
}
