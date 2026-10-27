package com.nguyenhoanglong.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** File parsing rules of the bulk product import, without Spring or a database. */
class ProductImportParsingTest {

    @Test
    void numbersAcceptVietnameseAndPlainFormats() {
        assertEquals(0, new BigDecimal("199000").compareTo(ProductImportService.parseNumber("199.000")));
        assertEquals(0, new BigDecimal("199000").compareTo(ProductImportService.parseNumber("199,000")));
        assertEquals(0, new BigDecimal("199000").compareTo(ProductImportService.parseNumber("199 000")));
        assertEquals(0, new BigDecimal("1250000").compareTo(ProductImportService.parseNumber("1.250.000")));
        assertEquals(0, new BigDecimal("12.5").compareTo(ProductImportService.parseNumber("12,5")));
        assertNull(ProductImportService.parseNumber("abc"));
    }

    @Test
    void moneyStripsCurrencySuffixInAnyCase() {
        List<String> errors = new ArrayList<>();
        for (String raw : List.of("199.000 VNĐ", "199.000vnđ", "199000 VND", "199.000đ", "199.000 ₫", "199000")) {
            BigDecimal v = ProductImportService.parseMoney(raw, "Giá", errors);
            assertNotNull(v, raw);
            assertEquals(0, new BigDecimal("199000").compareTo(v), raw);
        }
        assertTrue(errors.isEmpty(), errors.toString());
        assertNull(ProductImportService.parseMoney("hai trăm", "Giá", errors));
        assertEquals(1, errors.size());
    }

    @Test
    void csvHandlesBomSemicolonQuotesAndNewlinesInCells() {
        String csv = "﻿Tên sản phẩm;Mô tả\r\n\"Áo \"\"basic\"\"\";\"dòng 1\ndòng 2\"\r\n";
        List<List<String>> table = ProductImportService.readCsv(csv);
        assertEquals(2, table.size());
        assertEquals("Tên sản phẩm", table.get(0).get(0));
        assertEquals("Áo \"basic\"", table.get(1).get(0));
        assertEquals("dòng 1\ndòng 2", table.get(1).get(1));
    }

    @Test
    void headersMatchWithoutAccentsOrRequiredMarkers() {
        List<String> errors = new ArrayList<>();
        var rows = ProductImportService.toRows(List.of(
                List.of("ten san pham", "DANH MỤC (*)", "Gia", "sku", "Tồn kho", "Cột lạ"),
                List.of("", "", "", "", "", ""),
                List.of("Áo", "Nam", "100000", "A-1", "5", "x")), errors);
        assertTrue(errors.isEmpty(), errors.toString());
        assertEquals(1, rows.size(), "blank lines are skipped");
        assertEquals(3, rows.get(0).number(), "row numbers follow the spreadsheet");
        assertEquals("A-1", rows.get(0).get("sku"));
    }

    @Test
    void missingRequiredColumnIsReported() {
        List<String> errors = new ArrayList<>();
        ProductImportService.toRows(List.of(List.of("Tên sản phẩm", "Giá"), List.of("Áo", "1")), errors);
        assertEquals(1, errors.size());
        assertTrue(errors.get(0).contains("Danh mục"));
        assertTrue(errors.get(0).contains("SKU"));
    }
}
