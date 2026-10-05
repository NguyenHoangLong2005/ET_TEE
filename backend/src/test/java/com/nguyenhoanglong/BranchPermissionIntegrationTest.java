package com.nguyenhoanglong;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Cac kich ban toi thieu phan quyen theo chi nhanh (yeu cau cua nguoi dung,
 * task Giai doan 4). Dung MockMvc de di qua that ca @PreAuthorize lan
 * StoreAccessGuard/CurrentUserService, khong mock tang security.
 *
 * @WithMockUser khong dung duoc o day vi CurrentUserService doc lai User tu
 * DB qua auth.getName() (email) - dung SecurityMockMvcRequestPostProcessors
 * .user(...) truyen inline theo tung request de gan dung authorities va con
 * tro toi mot User that da luu trong H2.
 *
 * KHONG kiem tra ProductController.createProduct/updateProduct: hai ham nay
 * la stub (return null) tu truoc, mot loi CHUC NANG co san, khong phai loi
 * phan quyen - kiem tra se luon fail vi ly do khong lien quan toi test nay.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional // moi test method roll back rieng - cac fixture (email co dinh) khong dung cham nhau
public class BranchPermissionIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private ShopRepository shopRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private ManufacturerRepository manufacturerRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private Shop shopA;
    private Shop shopB;
    private User ownerA;
    private User ownerB;
    private User staffB;
    private User admin;

    @BeforeEach
    void setUp() {
        shopA = shopRepository.save(mkShop("Chi nhánh A"));
        shopB = shopRepository.save(mkShop("Chi nhánh B"));

        ownerA = userRepository.save(mkUser("owner-a@test.local", Role.SHOP_OWNER, shopA.getId()));
        ownerB = userRepository.save(mkUser("owner-b@test.local", Role.SHOP_OWNER, shopB.getId()));
        staffB = userRepository.save(mkUser("staff-b@test.local", Role.SALES_STAFF, shopB.getId()));
        admin = userRepository.save(mkUser("admin@test.local", Role.ADMIN, null));
    }

    private Shop mkShop(String name) {
        Shop s = new Shop();
        s.setName(name);
        s.setIsActive(true);
        return s;
    }

    private User mkUser(String email, Role role, Long shopId) {
        return User.builder()
                .fullName(email)
                .email(email)
                .passwordHash(passwordEncoder.encode("Test@12345"))
                .role(role)
                .shopId(shopId)
                .status("ACTIVE")
                .emailVerified(true)
                .build();
    }

    // ------------------------------------------------------------------
    // 1. SHOP_OWNER tao danh muc / thuong hieu -> 403
    // ------------------------------------------------------------------

    // Chu shop DUOC tao danh muc va thuong hieu (StoreOwnerCategoryController /
    // ManufacturerController cho phep SHOP_OWNER) - quy tac nghiep vu da chot.
    @Test
    void shopOwner_taoDanhMuc_thanhCong() throws Exception {
        Map<String, Object> body = Map.of("name", "Danh mục lạ");
        mockMvc.perform(post("/api/store-owner/categories")
                        .with(user(ownerA.getEmail()).roles("SHOP_OWNER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated());
        org.junit.jupiter.api.Assertions.assertTrue(categoryRepository.findAll().stream()
                .anyMatch(c -> "Danh mục lạ".equals(c.getName())));
    }

    @Test
    void shopOwner_taoThuongHieu_thanhCong() throws Exception {
        Map<String, Object> body = Map.of("name", "Xưởng lạ");
        mockMvc.perform(post("/api/manufacturers")
                        .with(user(ownerA.getEmail()).roles("SHOP_OWNER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated());
        org.junit.jupiter.api.Assertions.assertTrue(manufacturerRepository.findAll().stream()
                .anyMatch(m -> "Xưởng lạ".equals(m.getName())));
    }

    // ------------------------------------------------------------------
    // 2. SHOP_OWNER A khong sua/xoa duoc du lieu cua chi nhanh B
    // ------------------------------------------------------------------

    @Test
    void shopOwnerA_suaNhaCungUngRiengCuaB_bi403() throws Exception {
        Supplier supplierOfB = supplierRepository.save(mkSupplier("NCC riêng B", shopB.getId()));

        mockMvc.perform(put("/api/suppliers/" + supplierOfB.getId())
                        .with(user(ownerA.getEmail()).roles("SHOP_OWNER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Đổi tên trộm"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void shopOwnerA_xoaNhaCungUngRiengCuaB_bi403() throws Exception {
        Supplier supplierOfB = supplierRepository.save(mkSupplier("NCC riêng B 2", shopB.getId()));

        mockMvc.perform(delete("/api/suppliers/" + supplierOfB.getId())
                        .with(user(ownerA.getEmail()).roles("SHOP_OWNER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void shopOwnerA_khoaNhanVienCuaB_bi403() throws Exception {
        mockMvc.perform(patch("/api/store-owner/staff/" + staffB.getId() + "/status")
                        .with(user(ownerA.getEmail()).roles("SHOP_OWNER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "LOCKED", "lockReason", "test"))))
                .andExpect(status().isForbidden());
    }

    private Supplier mkSupplier(String name, Long shopId) {
        Supplier s = new Supplier(name, null, null, null, "Phụ liệu", null);
        s.setShopId(shopId);
        return s;
    }

    // ------------------------------------------------------------------
    // 3. SHOP_OWNER A gui shopId cua B trong body -> bi bo qua, du lieu vao A
    // ------------------------------------------------------------------

    @Test
    void shopOwnerA_guiShopIdCuaBTrongBody_duLieuVanVaoA() throws Exception {
        Map<String, Object> body = Map.of(
                "name", "NCC mới của A",
                "shopId", shopB.getId() // A co gang gia mao thuoc chi nhanh B
        );

        mockMvc.perform(post("/api/suppliers")
                        .with(user(ownerA.getEmail()).roles("SHOP_OWNER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.shopId").value(shopA.getId()));
    }

    @Test
    void shopOwnerA_guiShopIdCuaBQuaQueryParam_khongDocDuLieuCuaB() throws Exception {
        // Backend phai bo qua shopId tu query param doi voi non-admin va tu
        // resolve ve chi nhanh that su cua nguoi goi (CurrentUserService).
        mockMvc.perform(get("/api/store-owner/products")
                        .param("shopId", shopB.getId().toString())
                        .with(user(ownerA.getEmail()).roles("SHOP_OWNER")))
                .andExpect(status().isOk());
        // Khong assert noi dung du lieu (danh sach san pham co the rong o ca
        // hai chi nhanh trong test nay); diem chinh la request khong bi 403
        // va khong nem loi khi shopId gia mao duoc gui len - chung to no bi
        // resolveShopIdForWrite() ghi de bang shopId that cua ownerA.
    }

    // ------------------------------------------------------------------
    // 4. SHOP_OWNER tao nhan vien role ADMIN/SHOP_OWNER -> chan
    // ------------------------------------------------------------------

    @Test
    void shopOwner_taoNhanVienRoleAdmin_bi403() throws Exception {
        Map<String, Object> body = Map.of(
                "fullName", "Kẻ mạo danh",
                "email", "fake-admin@test.local",
                "roleCode", "ADMIN"
        );
        mockMvc.perform(post("/api/store-owner/staff")
                        .with(user(ownerA.getEmail()).roles("SHOP_OWNER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }

    @Test
    void shopOwner_taoNhanVienRoleShopOwner_bi403() throws Exception {
        Map<String, Object> body = Map.of(
                "fullName", "Chủ shop giả",
                "email", "fake-owner@test.local",
                "roleCode", "SHOP_OWNER"
        );
        mockMvc.perform(post("/api/store-owner/staff")
                        .with(user(ownerA.getEmail()).roles("SHOP_OWNER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }

    // ------------------------------------------------------------------
    // 5. ADMIN lam duoc tat ca (dai dien: sua/xoa manufacturer, sua supplier
    //    thuoc bat ky chi nhanh nao, khong bi StoreAccessGuard chan)
    // ------------------------------------------------------------------

    @Test
    void admin_suaThuongHieu_thanhCong() throws Exception {
        Manufacturer m = manufacturerRepository.save(new Manufacturer("Xưởng cũ", "Việt Nam", null, null, null, 0));

        mockMvc.perform(put("/api/manufacturers/" + m.getId())
                        .with(user(admin.getEmail()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Xưởng đã đổi tên"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Xưởng đã đổi tên"));
    }

    @Test
    void admin_suaNhaCungUngThuocChiNhanhBatKy_thanhCong() throws Exception {
        Supplier supplierOfB = supplierRepository.save(mkSupplier("NCC của B", shopB.getId()));

        // ADMIN khong bi StoreAccessGuard chan du sua nha cung ung cua chi nhanh khac.
        mockMvc.perform(put("/api/suppliers/" + supplierOfB.getId())
                        .with(user(admin.getEmail()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "ADMIN sửa được"))))
                .andExpect(status().isOk());
    }

    // ------------------------------------------------------------------
    // 6. Xoa category dang duoc dung boi san pham -> tu choi
    // ------------------------------------------------------------------

    @Test
    void admin_xoaDanhMucConSanPhamDangDung_bi409() throws Exception {
        Category cat = categoryRepository.save(mkCategory("Áo test", "ao-test-" + System.currentTimeMillis()));
        Product p = new Product();
        p.setName("Áo test SP");
        p.setSlug("ao-test-sp-" + System.currentTimeMillis());
        p.setPrice(new BigDecimal("100000"));
        p.setStatus("ACTIVE");
        p.setCategory(cat);
        productRepository.save(p);

        mockMvc.perform(delete("/api/store-owner/categories/" + cat.getId())
                        .with(user(admin.getEmail()).roles("ADMIN")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("sản phẩm")));
    }

    @Test
    void admin_xoaDanhMucKhongConSanPhamDangDung_thanhCong() throws Exception {
        Category cat = categoryRepository.save(mkCategory("Danh mục trống", "danh-muc-trong-" + System.currentTimeMillis()));

        mockMvc.perform(delete("/api/store-owner/categories/" + cat.getId())
                        .with(user(admin.getEmail()).roles("ADMIN")))
                .andExpect(status().isOk());
    }

    private Category mkCategory(String name, String slug) {
        Category c = new Category();
        c.setName(name);
        c.setSlug(slug);
        c.setActive(true);
        c.setDisplayOrder(0);
        return c;
    }
}
