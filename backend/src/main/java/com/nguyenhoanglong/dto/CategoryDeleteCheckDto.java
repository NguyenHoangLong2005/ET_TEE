package com.nguyenhoanglong.dto;

/** Ket qua kiem tra dieu kien xoa mot danh muc. */
public class CategoryDeleteCheckDto {
    private final boolean canDelete;
    private final String reason;
    private final long childCount;
    private final long productCount;
    private final long openOrderCount;

    public CategoryDeleteCheckDto(boolean canDelete, String reason, long childCount, long productCount, long openOrderCount) {
        this.canDelete = canDelete;
        this.reason = reason;
        this.childCount = childCount;
        this.productCount = productCount;
        this.openOrderCount = openOrderCount;
    }

    public boolean isCanDelete() { return canDelete; }
    public String getReason() { return reason; }
    public long getChildCount() { return childCount; }
    public long getProductCount() { return productCount; }
    public long getOpenOrderCount() { return openOrderCount; }
}
