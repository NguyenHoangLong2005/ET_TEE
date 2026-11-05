package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.ProductVariant;
import com.nguyenhoanglong.repository.ProductVariantRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.*;

/**
 * Nhap kho hang loat tu file (.xlsx / .csv) - mot lo hang tu nha cung cap thuong co hang chuc
 * dong mau/size, nhap tay tung dong rat lau va de go nham.
 *
 * <p>Khop san pham CHI theo SKU cua bien the (ten de trung / go sai). Chay thu (dryRun) truoc de
 * xem tung dong hop le hay loi; khi xac nhan, TAT CA cac dong duoc nhap trong mot giao dich - co
 * dong loi thi khong nhap dong nao. Moi dong di qua dung {@link WarehouseService#inbound} nhu nhap
 * tay, nen ton kho, ton ban cua bien the va phieu nhap kho deu khop.</p>
 */
@Service
public class InboundImportService {

    static final int MAX_LINES = 500;
    static final int MAX_QUANTITY = 100_000;

    public static final class RowResult {
        public int row;
        public String sku;
        public String productName;
        public String variant;
        public Integer quantity;
        public String location;
        public String note;
        public String status;
        public List<String> errors = new ArrayList<>();
    }

    public static final class Report {
        public boolean dryRun;
        public String fileName;
        public List<String> fileErrors = new ArrayList<>();
        public int totalRows;
        public int validRows;
        public int invalidRows;
        public int importedRows;
        public int totalQuantity;
        public List<RowResult> rows = new ArrayList<>();
    }

    private final ProductVariantRepository variants;
    private final WarehouseService warehouse;
    private final TransactionTemplate tx;
    private final JdbcTemplate jdbc;

    public InboundImportService(ProductVariantRepository variants, WarehouseService warehouse,
                                TransactionTemplate tx, JdbcTemplate jdbc) {
        this.variants = variants;
        this.warehouse = warehouse;
        this.tx = tx;
        this.jdbc = jdbc;
    }

    public Report importFile(MultipartFile file, Long supplierId, String batchNote, boolean dryRun) {
        Report report = new Report();
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

        int header = -1;
        Map<String, Integer> col = Map.of();
        for (int i = 0; i < Math.min(table.size(), 10) && header < 0; i++) {
            Map<String, Integer> found = columns(table.get(i));
            if (found.containsKey("sku") && found.containsKey("qty")) {
                header = i;
                col = found;
            }
        }
        if (header < 0) {
            report.fileErrors.add("Không tìm thấy dòng tiêu đề có cột \"SKU\" và \"Số lượng\". Hãy dùng file mẫu.");
            return report;
        }

        Set<String> seen = new HashSet<>();
        for (int i = header + 1; i < table.size(); i++) {
            List<String> cells = table.get(i);
            String sku = cell(cells, col.get("sku"));
            String qtyText = cell(cells, col.get("qty"));
            if (sku.isEmpty() && qtyText.isEmpty()) continue; // dong trong
            RowResult r = new RowResult();
            r.row = i + 1;
            r.sku = sku;
            r.location = blankToNull(cell(cells, col.get("location")));
            r.note = blankToNull(cell(cells, col.get("note")));

            if (sku.isEmpty()) {
                r.errors.add("Thiếu SKU");
            } else if (!seen.add(sku.toUpperCase(Locale.ROOT))) {
                r.errors.add("SKU bị lặp trong file, hãy gộp số lượng vào một dòng");
            } else {
                // Doc ten san pham trong mot giao dich (Product la proxy lazy).
                String[] info = tx.execute(st -> variants.findBySku(sku)
                        .filter(v -> v.getProduct() != null)
                        .map(v -> new String[]{v.getProduct().getName(),
                                String.join(" / ", Arrays.stream(new String[]{v.getColor(), v.getSize()})
                                        .filter(s -> s != null && !s.isBlank()).toList())})
                        .orElse(null));
                if (info == null) {
                    r.errors.add("SKU không tồn tại trong danh mục");
                } else {
                    r.productName = info[0];
                    r.variant = info[1];
                }
            }
            Integer qty = parseQuantity(qtyText);
            if (qty == null) {
                r.errors.add(qtyText.isEmpty() ? "Thiếu số lượng" : "Số lượng phải là số nguyên dương");
            } else if (qty > MAX_QUANTITY) {
                r.errors.add("Số lượng tối đa mỗi dòng là " + MAX_QUANTITY);
            } else {
                r.quantity = qty;
            }
            if (r.location != null && r.location.length() > 100) r.errors.add("Vị trí kho tối đa 100 ký tự");
            if (r.note != null && r.note.length() > 500) r.errors.add("Ghi chú tối đa 500 ký tự");

            r.status = r.errors.isEmpty() ? "VALID" : "INVALID";
            if (r.errors.isEmpty()) {
                report.validRows++;
                report.totalQuantity += r.quantity;
            } else {
                report.invalidRows++;
            }
            report.rows.add(r);
        }
        report.totalRows = report.rows.size();
        if (report.totalRows == 0) {
            report.fileErrors.add("File không có dòng nào có SKU và số lượng");
            return report;
        }
        if (report.totalRows > MAX_LINES) {
            report.fileErrors.add("File có " + report.totalRows + " dòng, tối đa " + MAX_LINES + " dòng mỗi lần nhập");
            return report;
        }
        if (dryRun || report.invalidRows > 0) return report;

        String fileTag = "Nhập từ file " + Optional.ofNullable(report.fileName).orElse("");
        String batch = blankToNull(batchNote);
        try {
            tx.executeWithoutResult(status -> {
                for (RowResult r : report.rows) {
                    ProductVariant v = variants.findBySku(r.sku).orElseThrow();
                    String note = String.join(" · ", Arrays.stream(new String[]{r.note, batch, fileTag})
                            .filter(Objects::nonNull).toList());
                    warehouse.inbound(v.getProduct().getId(), null, r.quantity, r.location, supplierId, note, v.getId());
                    r.status = "IMPORTED";
                }
            });
            report.importedRows = report.rows.size();
        } catch (RuntimeException e) {
            // Mot dong loi -> ca giao dich hoan tac, khong dong nao duoc nhap.
            for (RowResult r : report.rows) r.status = "VALID";
            String reason = e instanceof ResponseStatusException rse ? rse.getReason() : e.getMessage();
            report.fileErrors.add("Không nhập được, chưa có dòng nào được ghi vào kho: " + reason);
            report.importedRows = 0;
        }
        return report;
    }

    /** File mau: trang "Nhap kho" de dien, trang "Danh sach SKU" de tra cuu (toan bo bien the). */
    public byte[] buildTemplate() {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CellStyle head = wb.createCellStyle();
            Font bold = wb.createFont();
            bold.setBold(true);
            head.setFont(bold);
            head.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            head.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Sheet input = wb.createSheet("Nhập kho");
            String[] cols = {"SKU", "Số lượng", "Vị trí kho", "Ghi chú"};
            org.apache.poi.ss.usermodel.Row h = input.createRow(0);
            for (int c = 0; c < cols.length; c++) {
                Cell cell = h.createCell(c);
                cell.setCellValue(cols[c]);
                cell.setCellStyle(head);
            }
            input.setColumnWidth(0, 22 * 256);
            input.setColumnWidth(1, 12 * 256);
            input.setColumnWidth(2, 16 * 256);
            input.setColumnWidth(3, 40 * 256);
            input.createFreezePane(0, 1);

            Sheet guide = wb.createSheet("Hướng dẫn");
            String[] lines = {
                    "Cách nhập kho bằng file",
                    "1. Điền mỗi màu/size một dòng ở trang \"Nhập kho\": SKU và Số lượng là bắt buộc.",
                    "2. Tra SKU ở trang \"Danh sách SKU\" (có tên sản phẩm, màu, size, tồn hiện tại).",
                    "3. Vị trí kho để trống = giữ vị trí hiện tại. Ghi chú không bắt buộc.",
                    "4. Mỗi SKU chỉ một dòng; tối đa " + MAX_LINES + " dòng mỗi lần.",
                    "5. Tải file lên, xem kết quả kiểm tra rồi bấm Xác nhận. Có dòng lỗi thì không dòng nào được nhập."};
            for (int i = 0; i < lines.length; i++) guide.createRow(i).createCell(0).setCellValue(lines[i]);
            guide.setColumnWidth(0, 95 * 256);

            Sheet list = wb.createSheet("Danh sách SKU");
            String[] listCols = {"SKU", "Sản phẩm", "Màu", "Size", "Tồn bán hiện tại", "Vị trí kho"};
            org.apache.poi.ss.usermodel.Row lh = list.createRow(0);
            for (int c = 0; c < listCols.length; c++) {
                Cell cell = lh.createCell(c);
                cell.setCellValue(listCols[c]);
                cell.setCellStyle(head);
            }
            int[] r = {1};
            jdbc.query("""
                    SELECT v.sku, p.name, v.color, v.size, v.available_quantity, i.warehouse_location
                    FROM product_variants v
                    JOIN products p ON p.id = v.product_id
                    LEFT JOIN inventories i ON i.product_id = p.id
                    WHERE v.sku IS NOT NULL AND p.status = 'ACTIVE'
                    ORDER BY p.name, v.color, v.size
                    """, rs -> {
                org.apache.poi.ss.usermodel.Row row = list.createRow(r[0]++);
                row.createCell(0).setCellValue(rs.getString(1));
                row.createCell(1).setCellValue(Objects.toString(rs.getString(2), ""));
                row.createCell(2).setCellValue(Objects.toString(rs.getString(3), ""));
                row.createCell(3).setCellValue(Objects.toString(rs.getString(4), ""));
                row.createCell(4).setCellValue(rs.getInt(5));
                row.createCell(5).setCellValue(Objects.toString(rs.getString(6), ""));
            });
            list.setColumnWidth(0, 22 * 256);
            list.setColumnWidth(1, 55 * 256);
            list.setColumnWidth(2, 14 * 256);
            list.setColumnWidth(3, 8 * 256);
            list.setColumnWidth(4, 16 * 256);
            list.setColumnWidth(5, 14 * 256);
            list.createFreezePane(0, 1);
            list.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0, Math.max(0, r[0] - 1), 0, listCols.length - 1));

            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không tạo được file mẫu");
        }
    }

    // ───────────────────────── helpers ─────────────────────────

    private static List<List<String>> readTable(MultipartFile file) throws IOException {
        String name = Optional.ofNullable(file.getOriginalFilename()).orElse("").toLowerCase(Locale.ROOT);
        if (name.endsWith(".xls")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Định dạng .xls (Excel 97-2003) không được hỗ trợ — hãy lưu lại thành .xlsx hoặc .csv");
        }
        if (name.endsWith(".xlsx")) {
            try (InputStream in = file.getInputStream()) {
                return ProductImportService.readXlsx(in);
            }
        }
        if (name.endsWith(".csv") || name.endsWith(".txt")) {
            return ProductImportService.readCsv(new String(file.getBytes(), StandardCharsets.UTF_8));
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ nhận file .xlsx hoặc .csv");
    }

    /** Vi tri cot theo tieu de (khong phan biet hoa/thuong, co dau hay khong). */
    static Map<String, Integer> columns(List<String> header) {
        Map<String, Integer> m = new HashMap<>();
        for (int c = 0; c < header.size(); c++) {
            String h = fold(header.get(c));
            if (h.isEmpty()) continue;
            if (h.equals("sku") || h.startsWith("ma sku") || h.equals("ma bien the")) m.putIfAbsent("sku", c);
            else if (h.startsWith("so luong") || h.equals("sl") || h.equals("quantity") || h.equals("qty")) m.putIfAbsent("qty", c);
            else if (h.startsWith("vi tri") || h.equals("location")) m.putIfAbsent("location", c);
            else if (h.startsWith("ghi chu") || h.equals("note")) m.putIfAbsent("note", c);
        }
        return m;
    }

    static String fold(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "").replace('đ', 'd');
        return n.replaceAll("[*:()]", "").replaceAll("\\s+", " ").trim();
    }

    static Integer parseQuantity(String s) {
        String t = s == null ? "" : s.trim();
        if (t.matches("\\d{1,3}([.,]\\d{3})+")) t = t.replaceAll("[.,]", ""); // "1.000" / "1,000" = nghin
        else if (t.matches("\\d+\\.0{1,2}")) t = t.substring(0, t.indexOf('.')); // "12.0" / "5.00"
        if (!t.matches("\\d{1,9}")) return null;
        int v = Integer.parseInt(t);
        return v > 0 ? v : null;
    }

    private static String cell(List<String> cells, Integer index) {
        if (index == null || index >= cells.size()) return "";
        String v = cells.get(index);
        return v == null ? "" : v.trim();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
