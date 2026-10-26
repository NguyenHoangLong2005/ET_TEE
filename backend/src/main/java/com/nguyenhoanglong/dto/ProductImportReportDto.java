package com.nguyenhoanglong.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Result of a bulk product import. The same shape is returned for the dry run
 * (nothing saved, every product checked) and for the real import (valid
 * products saved one by one, each in its own transaction).
 */
public class ProductImportReportDto {
    public String fileName;
    public boolean dryRun;
    public int totalRows;
    public int totalProducts;
    public int validProducts;
    public int invalidProducts;
    public int createdProducts;
    /** Problems with the file itself (unreadable, missing columns...); no product is imported when set. */
    public List<String> fileErrors = new ArrayList<>();
    public List<ProductResult> products = new ArrayList<>();

    public static class ProductResult {
        /** Spreadsheet row numbers (1-based, header is row 1) that make up this product. */
        public List<Integer> rows = new ArrayList<>();
        public String groupKey;
        public String name;
        public String categoryName;
        public BigDecimal price;
        public BigDecimal salePrice;
        public int variantCount;
        public int totalStock;
        public List<String> skus = new ArrayList<>();
        public int imageCount;
        /** VALID | INVALID | CREATED | FAILED */
        public String status;
        public List<String> errors = new ArrayList<>();
        public Long productId;
        public String slug;
    }
}
