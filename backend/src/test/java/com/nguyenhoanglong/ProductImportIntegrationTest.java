package com.nguyenhoanglong;

import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Bulk product import through the real endpoint: dry run first, then the import itself. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class ProductImportIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ShopRepository shopRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private ProductVariantRepository variantRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private User owner;
    private Category category;
    private String sfx;

    @BeforeEach
    void setUp() {
        sfx = String.valueOf(System.nanoTime());
        Shop shop = new Shop();
        shop.setName("Chi nhánh import " + sfx);
        shop.setIsActive(true);
        shop = shopRepository.save(shop);
        owner = userRepository.save(User.builder()
                .fullName("Owner import").email("owner-import-" + sfx + "@test.local")
                .passwordHash(passwordEncoder.encode("Test@12345"))
                .role(Role.SHOP_OWNER).shopId(shop.getId()).status("ACTIVE").emailVerified(true).build());
        Category c = new Category();
        c.setName("Áo import " + sfx);
        c.setSlug("ao-import-" + sfx);
        category = categoryRepository.save(c);
    }

    /** Two good products (one with two sizes on a continuation row) and one with a sale price above the list price. */
    private MockMultipartFile csv() {
        String text = "﻿Mã nhóm;Tên sản phẩm (*);Danh mục (*);Giá niêm yết (*);Giá khuyến mãi;SKU (*);Màu;Size;Tồn kho (*);Giới tính;Ảnh (URL, cách nhau bởi |)\n"
                + "A1;Áo thun import " + sfx + ";" + category.getName() + ";199.000;159000;IMP-A1-M-" + sfx + ";Đen;M;10;Nam;https://x.test/1.jpg|https://x.test/2.jpg\n"
                + "A1;;;;;IMP-A1-L-" + sfx + ";Đen;L;5;;\n"
                + "B2;Quần import " + sfx + ";" + category.getId() + ";300000;;IMP-B2-30-" + sfx + ";;30;3;;\n"
                + "C3;Áo lỗi " + sfx + ";" + category.getName() + ";100000;200000;IMP-C3-" + sfx + ";;;1;;\n";
        return new MockMultipartFile("file", "san-pham.csv", "text/csv", text.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void dryRunReportsWithoutSaving() throws Exception {
        mockMvc.perform(multipart("/api/store-owner/products/import").file(csv())
                        .with(user(owner.getEmail()).roles("SHOP_OWNER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.dryRun").value(true))
                .andExpect(jsonPath("$.data.totalRows").value(4))
                .andExpect(jsonPath("$.data.totalProducts").value(3))
                .andExpect(jsonPath("$.data.validProducts").value(2))
                .andExpect(jsonPath("$.data.invalidProducts").value(1))
                .andExpect(jsonPath("$.data.products[0].variantCount").value(2))
                .andExpect(jsonPath("$.data.products[0].totalStock").value(15))
                .andExpect(jsonPath("$.data.products[0].imageCount").value(2))
                .andExpect(jsonPath("$.data.products[2].status").value("INVALID"))
                .andExpect(jsonPath("$.data.products[2].errors[0]", containsString("Giá khuyến mãi")));

        assertFalse(variantRepository.existsBySku("IMP-A1-M-" + sfx));
    }

    @Test
    void importCreatesValidProductsAndSkipsInvalid() throws Exception {
        mockMvc.perform(multipart("/api/store-owner/products/import").file(csv()).param("dryRun", "false")
                        .with(user(owner.getEmail()).roles("SHOP_OWNER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.createdProducts").value(2))
                .andExpect(jsonPath("$.data.products[0].status").value("CREATED"))
                .andExpect(jsonPath("$.data.products[2].status").value("INVALID"));

        Product p = productRepository.findAll().stream()
                .filter(x -> x.getName().equals("Áo thun import " + sfx)).findFirst().orElseThrow();
        assertEquals(0, p.getPrice().compareTo(new java.math.BigDecimal("199000")));
        assertEquals("male", p.getGender());
        assertTrue(variantRepository.existsBySku("IMP-A1-L-" + sfx));
        assertFalse(variantRepository.existsBySku("IMP-C3-" + sfx));

        // the same file again: every SKU now exists, so nothing new is created
        mockMvc.perform(multipart("/api/store-owner/products/import").file(csv()).param("dryRun", "false")
                        .with(user(owner.getEmail()).roles("SHOP_OWNER")))
                .andExpect(jsonPath("$.data.createdProducts").value(0))
                .andExpect(jsonPath("$.data.products[0].errors[0]", containsString("SKU đã tồn tại")));
    }

    @Test
    void missingRequiredColumnIsAFileError() throws Exception {
        MockMultipartFile bad = new MockMultipartFile("file", "x.csv", "text/csv",
                "Tên sản phẩm,Giá\nÁo,100000\n".getBytes(StandardCharsets.UTF_8));
        mockMvc.perform(multipart("/api/store-owner/products/import").file(bad)
                        .with(user(owner.getEmail()).roles("SHOP_OWNER")))
                .andExpect(jsonPath("$.data.fileErrors[0]", containsString("Thiếu cột bắt buộc")))
                .andExpect(jsonPath("$.data.totalProducts").value(0));
    }

    @Test
    void templateIsAnXlsxThatImportsBack() throws Exception {
        byte[] xlsx = mockMvc.perform(get("/api/store-owner/products/import/template")
                        .with(user(owner.getEmail()).roles("SHOP_OWNER")))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString(".xlsx")))
                .andReturn().getResponse().getContentAsByteArray();

        // the template's own example rows must parse: 2 products, 4 rows
        mockMvc.perform(multipart("/api/store-owner/products/import")
                        .file(new MockMultipartFile("file", "mau.xlsx", "application/octet-stream", xlsx))
                        .with(user(owner.getEmail()).roles("SHOP_OWNER")))
                .andExpect(jsonPath("$.data.fileErrors", hasSize(0)))
                .andExpect(jsonPath("$.data.totalRows").value(4))
                .andExpect(jsonPath("$.data.totalProducts").value(2));
    }

    @Test
    void staffCannotImport() throws Exception {
        mockMvc.perform(multipart("/api/store-owner/products/import").file(csv())
                        .with(user(owner.getEmail()).roles("SALES_STAFF")))
                .andExpect(status().isForbidden());
    }
}
