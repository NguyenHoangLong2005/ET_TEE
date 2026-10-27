package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.ProductImportReportDto;
import com.nguyenhoanglong.dto.ProductImportReportDto.ProductResult;
import com.nguyenhoanglong.dto.StoreProductFormDto;
import com.nguyenhoanglong.entity.Category;
import com.nguyenhoanglong.entity.Manufacturer;
import com.nguyenhoanglong.entity.Supplier;
import com.nguyenhoanglong.repository.CategoryRepository;
import com.nguyenhoanglong.repository.ManufacturerRepository;
import com.nguyenhoanglong.repository.SupplierRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Bulk product import from a CSV or XLSX file.
 *
 * One row per variant (SKU). Rows that share the same "Mã nhóm" (or, when that
 * column is empty, the same product name) become one product; the product-level
 * columns only need to be filled on the first row of a group.
 *
 * Every product goes through StoreOwnerService.validateNewProduct / createProduct,
 * so the rules are exactly those of the single-product form. The import is not
 * all-or-nothing: each product is created in its own transaction and a bad row
 * only skips its own product. The dry run reports what would happen first.
 */
@Service
public class ProductImportService {

    static final int MAX_ROWS = 2000;
    private static final Pattern THOUSANDS = Pattern.compile("^\\d{1,3}([.,\\s]\\d{3})+$");
    private static final Pattern HEX = Pattern.compile("^#?[0-9a-fA-F]{6}$");

    private final StoreOwnerService storeOwnerService;
    private final CategoryRepository categoryRepository;
    private final ManufacturerRepository manufacturerRepository;
    private final SupplierRepository supplierRepository;
    private final CurrentUserService currentUserService;

    public ProductImportService(StoreOwnerService storeOwnerService,
                                CategoryRepository categoryRepository,
                                ManufacturerRepository manufacturerRepository,
                                SupplierRepository supplierRepository,
                                CurrentUserService currentUserService) {
        this.storeOwnerService = storeOwnerService;
        this.categoryRepository = categoryRepository;
        this.manufacturerRepository = manufacturerRepository;
        this.supplierRepository = supplierRepository;
        this.currentUserService = currentUserService;
    }

    // ───────────────────────── columns ─────────────────────────

    /** Canonical column -> template header. Order is the template's column order. */
    static final LinkedHashMap<String, String> COLUMNS = new LinkedHashMap<>();
    static {
        COLUMNS.put("group", "Mã nhóm");
        COLUMNS.put("name", "Tên sản phẩm (*)");
        COLUMNS.put("category", "Danh mục (*)");
        COLUMNS.put("price", "Giá niêm yết (*)");
        COLUMNS.put("salePrice", "Giá khuyến mãi");
        COLUMNS.put("sku", "SKU (*)");
        COLUMNS.put("color", "Màu");
        COLUMNS.put("colorHex", "Mã màu");
        COLUMNS.put("size", "Size");
        COLUMNS.put("stock", "Tồn kho (*)");
        COLUMNS.put("brand", "Thương hiệu");
        COLUMNS.put("targetGroup", "Đối tượng");
        COLUMNS.put("gender", "Giới tính");
        COLUMNS.put("productType", "Loại sản phẩm");
        COLUMNS.put("material", "Chất liệu");
        COLUMNS.put("manufacturer", "Nhà sản xuất");
        COLUMNS.put("supplier", "Nhà cung cấp");
        COLUMNS.put("images", "Ảnh (URL, cách nhau bởi |)");
        COLUMNS.put("description", "Mô tả");
        COLUMNS.put("status", "Trạng thái");
    }

    private static final List<String> REQUIRED = List.of("name", "category", "price", "sku", "stock");

    /** Normalised header text -> canonical column. Accepts the template headers plus common English / short forms. */
    private static final Map<String, String> ALIASES = new HashMap<>();
    static {
        alias("group", "ma_nhom", "nhom", "ma_san_pham", "ma_sp", "group", "product_code", "code");
        alias("name", "ten_san_pham", "ten", "ten_sp", "name", "product_name");
        alias("category", "danh_muc", "ma_danh_muc", "category", "category_id");
        alias("price", "gia_niem_yet", "gia", "gia_ban", "price");
        alias("salePrice", "gia_khuyen_mai", "gia_km", "sale_price");
        alias("sku", "sku", "ma_sku");
        alias("color", "mau", "mau_sac", "color");
        alias("colorHex", "ma_mau", "color_hex", "hex");
        alias("size", "size", "kich_co", "kich_thuoc");
        alias("stock", "ton_kho", "so_luong", "stock", "quantity");
        alias("brand", "thuong_hieu", "brand");
        alias("targetGroup", "doi_tuong", "target_group");
        alias("gender", "gioi_tinh", "gender");
        alias("productType", "loai_san_pham", "loai", "product_type");
        alias("material", "chat_lieu", "material");
        alias("manufacturer", "nha_san_xuat", "manufacturer");
        alias("supplier", "nha_cung_cap", "supplier");
        alias("images", "anh", "anh_url_cach_nhau_boi", "hinh_anh", "link_anh", "images", "image_urls", "image");
        alias("description", "mo_ta", "description");
        alias("status", "trang_thai", "status");
    }

    private static void alias(String column, String... names) {
        for (String n : names) ALIASES.put(n, column);
    }

    static String normalize(String s) {
        if (s == null) return "";
        String t = s.trim().toLowerCase(Locale.ROOT).replace('đ', 'd');
        t = Normalizer.normalize(t, Normalizer.Form.NFD).replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return t.replaceAll("[^a-z0-9]+", "_").replaceAll("^_+|_+$", "");
    }

    // ───────────────────────── import ─────────────────────────

    record Row(int number, Map<String, String> values) {
        String get(String column) {
            String v = values.get(column);
            return v == null || v.isBlank() ? null : v.trim();
        }
    }

    public ProductImportReportDto importProducts(MultipartFile file, boolean dryRun) {
        ProductImportReportDto report = new ProductImportReportDto();
        report.dryRun = dryRun;
        report.fileName = file == null ? null : file.getOriginalFilename();
        if (file == null || file.isEmpty()) {
            report.fileErrors.add("Chưa chọn file hoặc file rỗng");
            return report;
        }

        List<List<String>> table;
        try {
            table = readTable(file);
        } catch (ResponseStatusException e) {
            report.fileErrors.add(e.getReason());
            return report;
        } catch (Exception e) {
            report.fileErrors.add("Không đọc được file: " + e.getMessage());
            return report;
        }

        List<Row> rows = toRows(table, report.fileErrors);
        if (!report.fileErrors.isEmpty()) return report;
        report.totalRows = rows.size();
        if (rows.isEmpty()) {
            report.fileErrors.add("File không có dòng dữ liệu nào bên dưới dòng tiêu đề");
            return report;
        }
        if (rows.size() > MAX_ROWS) {
            report.fileErrors.add("File có " + rows.size() + " dòng, tối đa " + MAX_ROWS + " dòng mỗi lần nhập");
            return report;
        }

        Lookups lookups = new Lookups();
        Set<String> skusInFile = new HashSet<>();
        for (List<Row> group : group(rows).values()) {
            ProductResult result = new ProductResult();
            StoreProductFormDto form = buildForm(group, result, lookups, skusInFile);
            if (result.errors.isEmpty()) {
                try {
                    storeOwnerService.validateNewProduct(form);
                } catch (ResponseStatusException e) {
                    result.errors.add(e.getReason());
                }
            }
            if (!result.errors.isEmpty()) {
                result.status = "INVALID";
                report.invalidProducts++;
            } else {
                report.validProducts++;
                result.status = "VALID";
                if (!dryRun) {
                    try {
                        StoreProductFormDto saved = storeOwnerService.createProduct(form);
                        result.status = "CREATED";
                        result.productId = saved.id;
                        result.slug = saved.slug;
                        report.createdProducts++;
                    } catch (ResponseStatusException e) {
                        result.status = "FAILED";
                        result.errors.add(e.getReason());
                    } catch (RuntimeException e) {
                        result.status = "FAILED";
                        result.errors.add("Lỗi khi lưu: " + e.getMessage());
                    }
                }
            }
            report.products.add(result);
        }
        report.totalProducts = report.products.size();
        return report;
    }

    /** Groups rows by "Mã nhóm", or by product name when the row has no group code; keeps file order. */
    private static LinkedHashMap<String, List<Row>> group(List<Row> rows) {
        LinkedHashMap<String, List<Row>> groups = new LinkedHashMap<>();
        String lastKey = null;
        for (Row r : rows) {
            String code = r.get("group");
            String name = r.get("name");
            String key;
            if (code != null) key = "code:" + normalize(code);
            else if (name != null) key = "name:" + normalize(name);
            // a row with neither belongs to the product above it (continuation row for more sizes)
            else key = lastKey != null ? lastKey : "row:" + r.number();
            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(r);
            lastKey = key;
        }
        return groups;
    }

    private StoreProductFormDto buildForm(List<Row> group, ProductResult result, Lookups lookups, Set<String> skusInFile) {
        List<String> errors = result.errors;
        group.forEach(r -> result.rows.add(r.number()));
        Row first = group.get(0);
        result.groupKey = first.get("group");

        StoreProductFormDto f = new StoreProductFormDto();
        f.name = productValue(group, "name", errors);
        result.name = f.name;
        if (f.name == null) errors.add("Thiếu tên sản phẩm");

        String category = productValue(group, "category", errors);
        if (category == null) errors.add("Thiếu danh mục");
        else {
            Category c = lookups.category(category, errors);
            if (c != null) {
                f.categoryId = c.getId();
                result.categoryName = lookups.path(c);
            }
        }

        String price = productValue(group, "price", errors);
        if (price == null) errors.add("Thiếu giá niêm yết");
        else f.price = parseMoney(price, "Giá niêm yết", errors);
        String sale = productValue(group, "salePrice", errors);
        if (sale != null) f.salePrice = parseMoney(sale, "Giá khuyến mãi", errors);
        result.price = f.price;
        result.salePrice = f.salePrice;

        f.brand = productValue(group, "brand", errors);
        f.productType = productValue(group, "productType", errors);
        f.material = productValue(group, "material", errors);
        f.description = productValue(group, "description", errors);
        f.gender = mapChoice(productValue(group, "gender", errors), "Giới tính", errors, Map.of(
                "nam", "male", "male", "male", "nu", "female", "female", "female", "unisex", "unisex"));
        f.targetGroup = mapChoice(productValue(group, "targetGroup", errors), "Đối tượng", errors, Map.of(
                "nam", "men", "men", "men", "nu", "women", "women", "women", "tre_em", "kids", "kids", "kids",
                "em_be", "baby", "baby", "baby", "gia_dinh", "family", "family", "family"));
        String status = mapChoice(productValue(group, "status", errors), "Trạng thái", errors, Map.of(
                "active", "ACTIVE", "dang_ban", "ACTIVE", "hien", "ACTIVE",
                "inactive", "INACTIVE", "an", "INACTIVE", "ngung_ban", "INACTIVE", "nhap", "INACTIVE"));
        f.status = status == null ? "ACTIVE" : status;

        String manufacturer = productValue(group, "manufacturer", errors);
        if (manufacturer != null) f.manufacturerId = lookups.manufacturer(manufacturer, errors);
        String supplier = productValue(group, "supplier", errors);
        if (supplier != null) f.supplierId = lookups.supplier(supplier, errors);

        String images = productValue(group, "images", errors);
        if (images != null) {
            for (String url : images.split("[|\\r\\n]+")) {
                if (url.isBlank()) continue;
                StoreProductFormDto.ImageForm img = new StoreProductFormDto.ImageForm();
                img.imageUrl = url.trim();
                img.alt = f.name;
                f.images.add(img);
            }
        }
        result.imageCount = f.images.size();

        for (Row r : group) {
            StoreProductFormDto.VariantForm v = new StoreProductFormDto.VariantForm();
            v.sku = r.get("sku");
            v.color = r.get("color");
            v.size = r.get("size");
            String hex = r.get("colorHex");
            if (hex != null) {
                if (!HEX.matcher(hex).matches()) errors.add("Dòng " + r.number() + ": mã màu \"" + hex + "\" phải dạng #RRGGBB");
                else v.colorHex = hex.startsWith("#") ? hex.toUpperCase(Locale.ROOT) : "#" + hex.toUpperCase(Locale.ROOT);
            }
            if (v.sku == null) {
                errors.add("Dòng " + r.number() + ": thiếu SKU");
            } else if (!skusInFile.add(v.sku.toLowerCase(Locale.ROOT))) {
                errors.add("Dòng " + r.number() + ": SKU " + v.sku + " xuất hiện nhiều lần trong file");
            } else {
                result.skus.add(v.sku);
            }
            String stock = r.get("stock");
            if (stock == null) errors.add("Dòng " + r.number() + ": thiếu tồn kho");
            else {
                BigDecimal n = parseNumber(stock);
                if (n == null || n.signum() < 0 || n.stripTrailingZeros().scale() > 0 || n.compareTo(BigDecimal.valueOf(1_000_000)) > 0) {
                    errors.add("Dòng " + r.number() + ": tồn kho \"" + stock + "\" phải là số nguyên từ 0 đến 1.000.000");
                } else {
                    v.stock = n.intValueExact();
                    result.totalStock += v.stock;
                }
            }
            f.variants.add(v);
        }
        result.variantCount = f.variants.size();
        return f;
    }

    /**
     * Product-level value of a group: the first non-empty cell. A later row that
     * disagrees on a field that defines the product is reported, since it most
     * likely means two products accidentally share a group code.
     */
    private static String productValue(List<Row> group, String column, List<String> errors) {
        String value = null;
        int valueRow = 0;
        for (Row r : group) {
            String v = r.get(column);
            if (v == null) continue;
            if (value == null) {
                value = v;
                valueRow = r.number();
            } else if (!value.equals(v) && (column.equals("name") || column.equals("category")
                    || column.equals("price") || column.equals("salePrice"))) {
                errors.add("Dòng " + r.number() + ": " + COLUMNS.get(column).replace(" (*)", "").toLowerCase(Locale.ROOT)
                        + " \"" + v + "\" khác dòng " + valueRow + " (\"" + value + "\") trong cùng sản phẩm");
            }
        }
        return value;
    }

    private static String mapChoice(String raw, String label, List<String> errors, Map<String, String> choices) {
        if (raw == null) return null;
        String mapped = choices.get(normalize(raw));
        if (mapped == null) errors.add(label + " \"" + raw + "\" không hợp lệ");
        return mapped;
    }

    static BigDecimal parseMoney(String raw, String label, List<String> errors) {
        // (?iu): plain (?i) is ASCII-only in Java, so "VNĐ" with a capital Đ would not be stripped
        String s = raw.trim().replaceAll("(?iu)\\s*(vnđ|vnd|đ|d|₫)$", "").trim();
        BigDecimal n = parseNumber(s);
        if (n == null) {
            errors.add(label + " \"" + raw + "\" không phải là số");
            return null;
        }
        return n.stripTrailingZeros().scale() <= 0 ? n.setScale(0, java.math.RoundingMode.UNNECESSARY) : n;
    }

    /** Accepts 199000, 199.000, 199,000, 199 000 and plain decimals. */
    static BigDecimal parseNumber(String raw) {
        if (raw == null) return null;
        String s = raw.trim().replace(' ', ' ');
        if (THOUSANDS.matcher(s).matches()) s = s.replaceAll("[.,\\s]", "");
        else s = s.replace(',', '.');
        try {
            return new BigDecimal(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    // ───────────────────────── lookups ─────────────────────────

    /** Categories, manufacturers and suppliers loaded once per import. */
    private class Lookups {
        private final Map<Long, Category> categoriesById = new HashMap<>();
        private final Map<String, List<Category>> categoriesByKey = new HashMap<>();
        private List<Manufacturer> manufacturers;
        private List<Supplier> suppliers;

        Lookups() {
            for (Category c : categoryRepository.findAll()) categoriesById.put(c.getId(), c);
            for (Category c : categoriesById.values()) {
                categoriesByKey.computeIfAbsent(normalize(c.getName()), k -> new ArrayList<>()).add(c);
                String fullPath = normalize(path(c));
                if (!fullPath.equals(normalize(c.getName()))) {
                    categoriesByKey.computeIfAbsent(fullPath, k -> new ArrayList<>()).add(c);
                }
            }
        }

        String path(Category c) {
            List<String> parts = new ArrayList<>();
            Set<Long> seen = new HashSet<>();
            Category cur = c;
            while (cur != null && seen.add(cur.getId())) {
                parts.add(0, cur.getName());
                cur = cur.getParentId() == null ? null : categoriesById.get(cur.getParentId());
            }
            return String.join(" > ", parts);
        }

        Category category(String raw, List<String> errors) {
            Long id = parseId(raw);
            if (id != null) {
                Category c = categoriesById.get(id);
                if (c == null) errors.add("Danh mục ID " + id + " không tồn tại");
                return c;
            }
            List<Category> matches = categoriesByKey.getOrDefault(normalize(raw), List.of());
            if (matches.isEmpty()) {
                errors.add("Không tìm thấy danh mục \"" + raw + "\" (xem sheet Danh mục trong file mẫu)");
                return null;
            }
            if (matches.size() > 1) {
                errors.add("Danh mục \"" + raw + "\" trùng tên ở nhiều nhánh — ghi đầy đủ đường dẫn (VD: "
                        + path(matches.get(0)) + ") hoặc ID");
                return null;
            }
            return matches.get(0);
        }

        Long manufacturer(String raw, List<String> errors) {
            if (manufacturers == null) manufacturers = manufacturerRepository.findAll();
            Long id = parseId(raw);
            Optional<Manufacturer> m = manufacturers.stream()
                    .filter(x -> id != null ? id.equals(x.getId()) : normalize(x.getName()).equals(normalize(raw)))
                    .findFirst();
            if (m.isEmpty()) errors.add("Không tìm thấy nhà sản xuất \"" + raw + "\"");
            return m.map(Manufacturer::getId).orElse(null);
        }

        Long supplier(String raw, List<String> errors) {
            if (suppliers == null) {
                boolean admin = currentUserService.isAdmin();
                Long myShop = admin ? null : currentUserService.getCurrentUser().getShopId();
                // shared suppliers first, so a name clash resolves to the branch's own one only when it is the only match
                suppliers = supplierRepository.findAll().stream()
                        .filter(s -> admin || s.getShopId() == null || s.getShopId().equals(myShop))
                        .sorted(Comparator.comparing(s -> s.getShopId() == null ? 1 : 0))
                        .toList();
            }
            Long id = parseId(raw);
            Optional<Supplier> s = suppliers.stream()
                    .filter(x -> id != null ? id.equals(x.getId()) : normalize(x.getName()).equals(normalize(raw)))
                    .findFirst();
            if (s.isEmpty()) errors.add("Không tìm thấy nhà cung cấp \"" + raw + "\"");
            return s.map(Supplier::getId).orElse(null);
        }
    }

    private static Long parseId(String raw) {
        String s = raw.trim();
        if (s.endsWith(".0")) s = s.substring(0, s.length() - 2);
        return s.matches("\\d{1,18}") ? Long.valueOf(s) : null;
    }

    // ───────────────────────── reading files ─────────────────────────

    private List<List<String>> readTable(MultipartFile file) throws IOException {
        String name = Optional.ofNullable(file.getOriginalFilename()).orElse("").toLowerCase(Locale.ROOT);
        if (name.endsWith(".xls")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Định dạng .xls (Excel 97-2003) không được hỗ trợ — hãy lưu lại thành .xlsx hoặc .csv");
        }
        if (name.endsWith(".xlsx")) {
            try (InputStream in = file.getInputStream()) {
                return readXlsx(in);
            }
        }
        if (name.endsWith(".csv") || name.endsWith(".txt")) {
            return readCsv(new String(file.getBytes(), StandardCharsets.UTF_8));
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ nhận file .xlsx hoặc .csv");
    }

    static List<List<String>> readXlsx(InputStream in) throws IOException {
        List<List<String>> table = new ArrayList<>();
        try (Workbook wb = WorkbookFactory.create(in)) {
            Sheet sheet = wb.getSheetAt(0);
            FormulaEvaluator evaluator = wb.getCreationHelper().createFormulaEvaluator();
            DataFormatter formatter = new DataFormatter(Locale.ROOT);
            for (int i = 0; i <= sheet.getLastRowNum(); i++) {
                org.apache.poi.ss.usermodel.Row row = sheet.getRow(i);
                List<String> cells = new ArrayList<>();
                if (row != null) {
                    for (int c = 0; c < Math.max(0, row.getLastCellNum()); c++) {
                        cells.add(cellText(row.getCell(c), evaluator, formatter));
                    }
                }
                table.add(cells);
                if (table.size() > MAX_ROWS + 50) break;
            }
        }
        return table;
    }

    private static String cellText(Cell cell, FormulaEvaluator evaluator, DataFormatter formatter) {
        if (cell == null) return "";
        CellType type = cell.getCellType() == CellType.FORMULA ? evaluator.evaluateFormulaCell(cell) : cell.getCellType();
        if (type == CellType.NUMERIC && !DateUtil.isCellDateFormatted(cell)) {
            // the raw number, not the displayed "199,000" which depends on the cell's format
            return BigDecimal.valueOf(cell.getNumericCellValue()).stripTrailingZeros().toPlainString();
        }
        if (type == CellType.BOOLEAN) return String.valueOf(cell.getBooleanCellValue());
        return formatter.formatCellValue(cell, evaluator);
    }

    /** RFC 4180 CSV with quoted fields; the delimiter is ',' or ';' (Excel in Vietnamese locale saves with ';'). */
    static List<List<String>> readCsv(String text) {
        if (text.startsWith("﻿")) text = text.substring(1);
        int firstLineEnd = text.indexOf('\n');
        String header = firstLineEnd < 0 ? text : text.substring(0, firstLineEnd);
        char delimiter = count(header, ';') > count(header, ',') ? ';' : ',';

        List<List<String>> table = new ArrayList<>();
        List<String> row = new ArrayList<>();
        StringBuilder cell = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < text.length(); i++) {
            char ch = text.charAt(i);
            if (quoted) {
                if (ch == '"') {
                    if (i + 1 < text.length() && text.charAt(i + 1) == '"') {
                        cell.append('"');
                        i++;
                    } else {
                        quoted = false;
                    }
                } else {
                    cell.append(ch);
                }
            } else if (ch == '"') {
                quoted = true;
            } else if (ch == delimiter) {
                row.add(cell.toString());
                cell.setLength(0);
            } else if (ch == '\n' || ch == '\r') {
                if (ch == '\r' && i + 1 < text.length() && text.charAt(i + 1) == '\n') i++;
                row.add(cell.toString());
                cell.setLength(0);
                table.add(row);
                row = new ArrayList<>();
            } else {
                cell.append(ch);
            }
        }
        if (cell.length() > 0 || !row.isEmpty()) {
            row.add(cell.toString());
            table.add(row);
        }
        return table;
    }

    private static int count(String s, char c) {
        int n = 0;
        for (int i = 0; i < s.length(); i++) if (s.charAt(i) == c) n++;
        return n;
    }

    /** Maps the header row to canonical columns and turns the rest into rows, skipping fully blank lines. */
    static List<Row> toRows(List<List<String>> table, List<String> fileErrors) {
        int headerIndex = -1;
        for (int i = 0; i < table.size(); i++) {
            if (table.get(i).stream().anyMatch(s -> s != null && !s.isBlank())) {
                headerIndex = i;
                break;
            }
        }
        if (headerIndex < 0) {
            fileErrors.add("File trống");
            return List.of();
        }
        List<String> header = table.get(headerIndex);
        Map<Integer, String> columnAt = new HashMap<>();
        List<String> unknown = new ArrayList<>();
        for (int c = 0; c < header.size(); c++) {
            String h = header.get(c);
            if (h == null || h.isBlank()) continue;
            String column = ALIASES.get(normalize(h.replace("(*)", "")));
            if (column == null) unknown.add(h.trim());
            else if (columnAt.containsValue(column)) fileErrors.add("Cột \"" + h.trim() + "\" bị lặp");
            else columnAt.put(c, column);
        }
        List<String> missing = REQUIRED.stream().filter(r -> !columnAt.containsValue(r))
                .map(r -> COLUMNS.get(r).replace(" (*)", "")).toList();
        if (!missing.isEmpty()) {
            fileErrors.add("Thiếu cột bắt buộc: " + String.join(", ", missing)
                    + (unknown.isEmpty() ? "" : ". Cột không nhận ra: " + String.join(", ", unknown))
                    + ". Hãy dùng file mẫu.");
            return List.of();
        }

        List<Row> rows = new ArrayList<>();
        for (int i = headerIndex + 1; i < table.size(); i++) {
            List<String> cells = table.get(i);
            Map<String, String> values = new HashMap<>();
            columnAt.forEach((c, column) -> {
                if (c < cells.size() && cells.get(c) != null && !cells.get(c).isBlank()) values.put(column, cells.get(c).trim());
            });
            if (!values.isEmpty()) rows.add(new Row(i + 1, values));
        }
        return rows;
    }

    // ───────────────────────── template ─────────────────────────

    /** XLSX template: the product sheet with two example products, a guide, and the category list to copy from. */
    public byte[] buildTemplate() {
        Lookups lookups = new Lookups();
        List<Category> categories = new ArrayList<>(lookups.categoriesById.values());
        categories.sort(Comparator.comparing(lookups::path));
        // a category without children makes the most realistic example
        Set<Long> parents = new HashSet<>();
        categories.forEach(c -> { if (c.getParentId() != null) parents.add(c.getParentId()); });
        String exampleCategory = categories.stream().filter(c -> !parents.contains(c.getId()))
                .map(lookups::path).findFirst().orElse("Áo thun");

        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CellStyle headerStyle = wb.createCellStyle();
            Font bold = wb.createFont();
            bold.setBold(true);
            bold.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(bold);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_80_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            CellStyle requiredStyle = wb.createCellStyle();
            requiredStyle.cloneStyleFrom(headerStyle);
            requiredStyle.setFillForegroundColor(IndexedColors.DARK_RED.getIndex());

            Sheet sheet = wb.createSheet("San pham");
            org.apache.poi.ss.usermodel.Row head = sheet.createRow(0);
            List<String> keys = new ArrayList<>(COLUMNS.keySet());
            for (int c = 0; c < keys.size(); c++) {
                Cell cell = head.createCell(c);
                cell.setCellValue(COLUMNS.get(keys.get(c)));
                cell.setCellStyle(REQUIRED.contains(keys.get(c)) ? requiredStyle : headerStyle);
                sheet.setColumnWidth(c, keys.get(c).equals("images") || keys.get(c).equals("description") ? 40 * 256 : 18 * 256);
            }
            sheet.createFreezePane(0, 1);

            List<Map<String, Object>> examples = List.of(
                    example("group", "AT001", "name", "Áo thun basic cổ tròn", "category", exampleCategory,
                            "price", 199000, "salePrice", 159000, "sku", "AT001-DEN-M", "color", "Đen", "colorHex", "#111111",
                            "size", "M", "stock", 20, "brand", "ET.TEE", "targetGroup", "Nam", "gender", "Unisex",
                            "productType", "tshirt", "material", "Cotton 100%",
                            "images", "https://example.com/ao-thun-den-1.jpg|https://example.com/ao-thun-den-2.jpg",
                            "description", "Áo thun form regular, vải cotton thoáng mát.", "status", "Đang bán"),
                    example("group", "AT001", "sku", "AT001-DEN-L", "color", "Đen", "colorHex", "#111111", "size", "L", "stock", 15),
                    example("group", "AT001", "sku", "AT001-TRANG-M", "color", "Trắng", "colorHex", "#FFFFFF", "size", "M", "stock", 12),
                    example("group", "QJ002", "name", "Quần jean slim fit", "category", exampleCategory, "price", 459000,
                            "sku", "QJ002-XANH-30", "color", "Xanh đậm", "size", "30", "stock", 8, "brand", "ET.TEE",
                            "targetGroup", "Nam", "gender", "Nam", "material", "Denim", "status", "Ẩn"));
            for (int r = 0; r < examples.size(); r++) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(r + 1);
                for (int c = 0; c < keys.size(); c++) {
                    Object v = examples.get(r).get(keys.get(c));
                    if (v instanceof Number n) row.createCell(c).setCellValue(n.doubleValue());
                    else if (v != null) row.createCell(c).setCellValue(v.toString());
                }
            }

            // dropdowns for the closed lists, so typos are caught while typing
            DataValidationHelper dv = sheet.getDataValidationHelper();
            addList(sheet, dv, keys.indexOf("targetGroup"), "Nam", "Nữ", "Trẻ em", "Em bé", "Gia đình");
            addList(sheet, dv, keys.indexOf("gender"), "Nam", "Nữ", "Unisex");
            addList(sheet, dv, keys.indexOf("status"), "Đang bán", "Ẩn");

            Sheet guide = wb.createSheet("Huong dan");
            String[][] lines = {
                    {"Cột", "Cách điền"},
                    {"Mã nhóm", "Các dòng cùng mã nhóm là các biến thể (màu/size) của CÙNG một sản phẩm. Bỏ trống thì gom theo tên sản phẩm."},
                    {"Tên, danh mục, giá...", "Chỉ cần điền ở dòng đầu tiên của mỗi nhóm; các dòng sau chỉ cần SKU, màu, size, tồn kho."},
                    {"Danh mục", "Ghi tên, đường dẫn (VD: Nam > Áo thun) hoặc ID — xem sheet \"Danh muc\"."},
                    {"Giá", "Số nguyên, bội số của 1.000đ (VD: 199000). Giá khuyến mãi phải nhỏ hơn giá niêm yết, để trống nếu không giảm."},
                    {"SKU", "Duy nhất trong toàn hệ thống, tối đa 100 ký tự."},
                    {"Mã màu", "Dạng #RRGGBB, không bắt buộc."},
                    {"Ảnh", "Đường dẫn http(s), nhiều ảnh cách nhau bởi dấu |. Ảnh đầu tiên là ảnh bìa."},
                    {"Nhà sản xuất / cung cấp", "Ghi đúng tên hoặc ID đã có trong hệ thống."},
                    {"Trạng thái", "\"Đang bán\" (mặc định) hoặc \"Ẩn\"."},
                    {"Cột có (*)", "Bắt buộc. Tối đa " + MAX_ROWS + " dòng mỗi lần nhập."},
                    {"Lưu ý", "Hệ thống kiểm tra thử toàn bộ file trước khi nhập; sản phẩm có lỗi sẽ được bỏ qua, các sản phẩm hợp lệ vẫn được tạo."},
            };
            for (int r = 0; r < lines.length; r++) {
                org.apache.poi.ss.usermodel.Row row = guide.createRow(r);
                row.createCell(0).setCellValue(lines[r][0]);
                row.createCell(1).setCellValue(lines[r][1]);
                if (r == 0) {
                    row.getCell(0).setCellStyle(headerStyle);
                    row.getCell(1).setCellStyle(headerStyle);
                }
            }
            guide.setColumnWidth(0, 26 * 256);
            guide.setColumnWidth(1, 110 * 256);

            Sheet cats = wb.createSheet("Danh muc");
            org.apache.poi.ss.usermodel.Row catHead = cats.createRow(0);
            catHead.createCell(0).setCellValue("ID");
            catHead.createCell(1).setCellValue("Đường dẫn danh mục");
            catHead.getCell(0).setCellStyle(headerStyle);
            catHead.getCell(1).setCellStyle(headerStyle);
            for (int r = 0; r < categories.size(); r++) {
                org.apache.poi.ss.usermodel.Row row = cats.createRow(r + 1);
                row.createCell(0).setCellValue(categories.get(r).getId());
                row.createCell(1).setCellValue(lookups.path(categories.get(r)));
            }
            cats.setColumnWidth(0, 8 * 256);
            cats.setColumnWidth(1, 60 * 256);

            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Không tạo được file mẫu", e);
        }
    }

    private static Map<String, Object> example(Object... keyValues) {
        Map<String, Object> m = new HashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) m.put((String) keyValues[i], keyValues[i + 1]);
        return m;
    }

    private static void addList(Sheet sheet, DataValidationHelper dv, int column, String... values) {
        DataValidation validation = dv.createValidation(dv.createExplicitListConstraint(values),
                new CellRangeAddressList(1, MAX_ROWS, column, column));
        validation.setShowErrorBox(true);
        sheet.addValidationData(validation);
    }
}
