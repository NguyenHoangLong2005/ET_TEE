package com.nguyenhoanglong;

import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import com.nguyenhoanglong.service.InboundImportService;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

/** Nhap kho tu file: kiem tra tung dong, nhap tat ca hoac khong dong nao, ton kho khop nhap tay. */
@SpringBootTest
@ActiveProfiles("test")
class InboundImportIntegrationTest {

    @Autowired private InboundImportService service;
    @Autowired private CategoryRepository categories;
    @Autowired private ProductRepository products;
    @Autowired private ProductVariantRepository variants;
    @Autowired private InventoryRepository inventories;

    private String skuM;
    private String skuL;
    private Long productId;

    @BeforeEach
    void setUp() {
        Category c = categories.findAll().stream().findFirst().orElseGet(() -> {
            Category x = new Category();
            x.setName("Import");
            x.setSlug("import-" + System.nanoTime());
            return categories.save(x);
        });
        Product p = new Product();
        p.setName("Áo nhập file");
        p.setSlug("ao-nhap-file-" + System.nanoTime());
        p.setPrice(BigDecimal.valueOf(150000));
        p.setCategory(c);
        p.setStatus("ACTIVE");
        p.setSoldCount(0);
        p = products.save(p);
        productId = p.getId();
        long n = System.nanoTime();
        skuM = "IMP-" + n + "-M";
        skuL = "IMP-" + n + "-L";
        for (String[] v : new String[][]{{skuM, "M"}, {skuL, "L"}}) {
            ProductVariant pv = new ProductVariant();
            pv.setProduct(p);
            pv.setSku(v[0]);
            pv.setColor("Trắng");
            pv.setSize(v[1]);
            pv.setStock(2);
            pv.setAvailableQuantity(2);
            pv.setPrice(BigDecimal.valueOf(150000));
            variants.save(pv);
        }
        Inventory inv = new Inventory();
        inv.setProductId(productId);
        inv.setProductName(p.getName());
        inv.setQuantityOnHand(4);
        inv.setQuantityReserved(0);
        inv.setShopId(1L);
        inv.setReorderLevel(5);
        inventories.save(inv);
    }

    private MockMultipartFile xlsx(Object[]... rows) throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            var sheet = wb.createSheet("Nhập kho");
            String[] head = {"SKU", "Số lượng", "Vị trí kho", "Ghi chú"};
            var h = sheet.createRow(0);
            for (int i = 0; i < head.length; i++) h.createCell(i).setCellValue(head[i]);
            for (int r = 0; r < rows.length; r++) {
                var row = sheet.createRow(r + 1);
                for (int c = 0; c < rows[r].length; c++) {
                    Object v = rows[r][c];
                    if (v instanceof Number num) row.createCell(c).setCellValue(num.doubleValue());
                    else if (v != null) row.createCell(c).setCellValue(v.toString());
                }
            }
            wb.write(out);
            return new MockMultipartFile("file", "lo-hang.xlsx", "application/octet-stream", out.toByteArray());
        }
    }

    private int available(String sku) {
        return variants.findBySku(sku).orElseThrow().getAvailableQuantity();
    }

    private int onHand() {
        return inventories.findByProductId(productId).orElseThrow().getQuantityOnHand();
    }

    @Test
    void dryRunReportsEveryProblemAndWritesNothing() throws Exception {
        var report = service.importFile(xlsx(
                new Object[]{skuM, 5, "A-01", null},
                new Object[]{"KHONG-CO", 3},
                new Object[]{skuM, 1},
                new Object[]{skuL, "abc"},
                new Object[]{skuL, -2}), null, null, true);
        assertTrue(report.fileErrors.isEmpty(), report.fileErrors.toString());
        assertEquals(5, report.totalRows);
        assertEquals(1, report.validRows);
        assertEquals(4, report.invalidRows);
        assertTrue(report.rows.get(1).errors.get(0).contains("không tồn tại"));
        assertTrue(report.rows.get(2).errors.get(0).contains("lặp"));
        assertEquals(2, available(skuM));
        assertEquals(4, onHand());
    }

    @Test
    void confirmedImportAddsStockLikeManualReceiving() throws Exception {
        var report = service.importFile(xlsx(
                new Object[]{skuM, 10, "B-02", "Lô tháng 11"},
                new Object[]{skuL, "1.000"}), null, "Phiếu NCC 123", false);
        assertTrue(report.fileErrors.isEmpty(), report.fileErrors.toString());
        assertEquals(2, report.importedRows);
        assertEquals(1010, report.totalQuantity);
        assertEquals(12, available(skuM));
        assertEquals(1002, available(skuL));
        assertEquals(4 + 1010, onHand());
        assertEquals("B-02", inventories.findByProductId(productId).orElseThrow().getWarehouseLocation());
    }

    @Test
    void anInvalidRowBlocksTheWholeFile() throws Exception {
        var report = service.importFile(xlsx(
                new Object[]{skuM, 10},
                new Object[]{"KHONG-CO", 3}), null, null, false);
        assertEquals(0, report.importedRows);
        assertEquals(2, available(skuM));
        assertEquals(4, onHand());
    }

    @Test
    void csvWithVietnameseSemicolonsWorks() {
        String csv = "SKU;Số lượng;Vị trí kho\n" + skuM + ";3;C-03\n";
        var report = service.importFile(new MockMultipartFile("file", "lo.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8)), null, null, false);
        assertTrue(report.fileErrors.isEmpty(), report.fileErrors.toString());
        assertEquals(1, report.importedRows);
        assertEquals(5, available(skuM));
    }

    @Test
    void templateHasInputSheetFirstAndSkuList() throws Exception {
        try (Workbook wb = WorkbookFactory.create(new ByteArrayInputStream(service.buildTemplate()))) {
            assertEquals("Nhập kho", wb.getSheetAt(0).getSheetName());
            assertEquals("SKU", wb.getSheetAt(0).getRow(0).getCell(0).getStringCellValue());
            var list = wb.getSheet("Danh sách SKU");
            assertNotNull(list);
            boolean found = false;
            for (int i = 1; i <= list.getLastRowNum(); i++) {
                if (skuM.equals(list.getRow(i).getCell(0).getStringCellValue())) found = true;
            }
            assertTrue(found, "SKU list must include catalogue variants");
        }
    }
}
