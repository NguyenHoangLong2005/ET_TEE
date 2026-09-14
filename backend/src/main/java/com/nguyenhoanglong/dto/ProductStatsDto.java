package com.nguyenhoanglong.dto;

import java.util.LinkedHashMap;
import java.util.Map;

public class ProductStatsDto {
    /** Counts per targetGroup for the sidebar (Nam/Nữ/Bé trai/Bé gái/Gia đình/Em bé). */
    private Map<String, Long> targetGroup = new LinkedHashMap<>();
    /** Counts per productType for the sidebar (Áo thun/Quần/Váy/...). */
    private Map<String, Long> productType = new LinkedHashMap<>();
    /** Counts per category slug. */
    private Map<String, Long> category = new LinkedHashMap<>();
    /** Total active products. */
    private long totalActive;

    public Map<String, Long> getTargetGroup() { return targetGroup; }
    public void setTargetGroup(Map<String, Long> targetGroup) { this.targetGroup = targetGroup; }
    public Map<String, Long> getProductType() { return productType; }
    public void setProductType(Map<String, Long> productType) { this.productType = productType; }
    public Map<String, Long> getCategory() { return category; }
    public void setCategory(Map<String, Long> category) { this.category = category; }
    public long getTotalActive() { return totalActive; }
    public void setTotalActive(long totalActive) { this.totalActive = totalActive; }
}
