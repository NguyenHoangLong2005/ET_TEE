package com.nguyenhoanglong.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class PriceUtils {

    private static final BigDecimal THOUSAND = BigDecimal.valueOf(1000);

    private PriceUtils() {}

    /** Rounds a VND amount to the nearest thousand (e.g. 52794.36 -> 53000). */
    public static BigDecimal roundToThousand(BigDecimal amount) {
        if (amount == null) return null;
        return amount.divide(THOUSAND, 0, RoundingMode.HALF_UP).multiply(THOUSAND);
    }
}
