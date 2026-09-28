package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.ApiResponse;
import com.nguyenhoanglong.dto.PaginatedResponseDto;
import com.nguyenhoanglong.entity.Supplier;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.SupplierRepository;
import com.nguyenhoanglong.service.CurrentUserService;
import com.nguyenhoanglong.service.StoreAccessGuard;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Nha cung ung: shop_id NULL = dung chung toan chuoi (chi ADMIN sua/xoa, moi
 * SHOP_OWNER van XEM va CHON duoc khi nhap hang); shop_id co gia tri = rieng
 * cua mot chi nhanh (SHOP_OWNER cua dung chi nhanh do duoc CRUD toan quyen).
 */
@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {

    private final SupplierRepository supplierRepository;
    private final CurrentUserService currentUserService;
    private final StoreAccessGuard storeAccessGuard;

    public SupplierController(SupplierRepository supplierRepository,
                               CurrentUserService currentUserService,
                               StoreAccessGuard storeAccessGuard) {
        this.supplierRepository = supplierRepository;
        this.currentUserService = currentUserService;
        this.storeAccessGuard = storeAccessGuard;
    }

    private void seedDefaultsIfEmpty() {
        if (supplierRepository.count() == 0) {
            List<Supplier> defaults = List.of(
                new Supplier("Công Ty Cổ Phần Vải Sợi Bảo Minh", "Lô B1, KCN Bảo Minh, Vụ Bản, Nam Định", "02283861888", "sales@baominhtextile.com", "Vải sợi dệt thoi & dệt kim", "Nhà cung ứng vải cotton 100% chải kỹ, vải nỉ da cá và vải kate chống nhăn cao cấp."),
                new Supplier("Công Ty TNHH Khóa Kéo YKK Việt Nam", "KCN Nhơn Trạch 3, Nhơn Trạch, Đồng Nai", "02513560678", "ykk_vn_support@ykk.com", "Phụ liệu khóa kéo kim loại & nhựa", "Khóa kéo đồng, khóa chống nước tiêu chuẩn quốc tế cho áo khoác và túi phụ ET.TEE."),
                new Supplier("Công Ty TNHH Phụ Liệu May Mặc Song Toàn", "45 Đường số 7, Bình Hưng Hòa, Bình Tân, TP.HCM", "0908123456", "songtoan.accessories@gmail.com", "Nút áo, cúc bấm & nhãn dệt thương hiệu", "Cung cấp nhãn dệt cổ áo, tem size, tag giấy treo và nút kim loại dập chìm logo ET.TEE."),
                new Supplier("Xưởng Bao Bì Carton & Túi Niêm Phong BoxEco", "KCN Quang Minh, Mê Linh, Hà Nội", "0987654321", "boxeco.packaging@gmail.com", "Bao bì đóng gói & túi nilon phân hủy sinh học", "Hộp quà carton sóng E in offset ET.TEE và túi bọc zip bảo vệ quần áo chống ẩm.")
            );
            supplierRepository.saveAll(defaults);
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN', 'WAREHOUSE_STAFF')")
    public ResponseEntity<ApiResponse<PaginatedResponseDto<Supplier>>> getSuppliers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String keyword) {

        seedDefaultsIfEmpty();

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        String cleanKeyword = (keyword != null && !keyword.trim().isEmpty()) ? keyword.trim() : null;

        User user = currentUserService.getCurrentUser();
        Page<Supplier> pagedResult;
        if (currentUserService.isAdmin()) {
            // ADMIN thay tat ca: dung chung + moi chi nhanh.
            pagedResult = supplierRepository.searchSuppliers(cleanKeyword, pageable);
        } else {
            // SHOP_OWNER/WAREHOUSE_STAFF: dung chung (shop_id NULL) + rieng chi nhanh minh.
            pagedResult = supplierRepository.searchSuppliersVisibleToShop(cleanKeyword, user.getShopId(), pageable);
        }

        PaginatedResponseDto<Supplier> responseDto = new PaginatedResponseDto<>(
                pagedResult.getContent(),
                (int) pagedResult.getTotalElements(),
                page,
                size,
                pagedResult.getTotalPages(),
                null
        );

        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách nhà cung cấp thành công", responseDto));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN', 'WAREHOUSE_STAFF')")
    public ResponseEntity<ApiResponse<Supplier>> getSupplierById(@PathVariable Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhà cung cấp"));
        if (supplier.getShopId() != null) {
            // Nha cung ung rieng chi nhanh: chi ADMIN hoac dung chi nhanh do duoc xem.
            storeAccessGuard.assertOwnsShop(supplier.getShopId());
        }
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin nhà cung cấp thành công", supplier));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Supplier>> createSupplier(@RequestBody Supplier request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên nhà cung cấp không được để trống");
        }

        Supplier newEntity = new Supplier(
                request.getName().trim(),
                request.getAddress() != null ? request.getAddress().trim() : null,
                request.getPhone() != null ? request.getPhone().trim() : null,
                request.getEmail() != null ? request.getEmail().trim() : null,
                request.getProductType() != null ? request.getProductType().trim() : "Phụ liệu may mặc",
                request.getDescription() != null ? request.getDescription().trim() : null
        );
        // shopId cua request KHONG duoc tin: SHOP_OWNER luon tao vao chi
        // nhanh cua chinh ho; ADMIN duoc chi dinh (null = dung chung).
        newEntity.setShopId(currentUserService.resolveShopIdForWrite(request.getShopId()));
        String actor = currentUserService.getCurrentUserIdOrNull();
        newEntity.setCreatedBy(actor);
        newEntity.setUpdatedBy(actor);

        Supplier saved = supplierRepository.save(newEntity);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo mới nhà cung cấp thành công", saved));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Supplier>> updateSupplier(
            @PathVariable Long id,
            @RequestBody Supplier request) {

        Supplier existing = supplierRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhà cung cấp"));
        // SHOP_OWNER chi sua duoc nha cung ung RIENG cua chi nhanh minh, khong
        // duoc dong vao nha cung ung dung chung (shopId null) hay chi nhanh khac.
        storeAccessGuard.assertOwnsShopForWrite(existing.getShopId());

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            existing.setName(request.getName().trim());
        }
        if (request.getAddress() != null) {
            existing.setAddress(request.getAddress().trim());
        }
        if (request.getPhone() != null) {
            existing.setPhone(request.getPhone().trim());
        }
        if (request.getEmail() != null) {
            existing.setEmail(request.getEmail().trim());
        }
        if (request.getProductType() != null) {
            existing.setProductType(request.getProductType().trim());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription().trim());
        }
        // shopId cua nha cung ung khong doi qua request body: doi chi nhanh
        // cho mot nha cung ung la thao tac nhay cam, chua co nghiep vu cho no.
        existing.setUpdatedBy(currentUserService.getCurrentUserIdOrNull());

        Supplier updated = supplierRepository.save(existing);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin nhà cung cấp thành công", updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteSupplier(@PathVariable Long id) {
        Supplier existing = supplierRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhà cung cấp"));
        storeAccessGuard.assertOwnsShopForWrite(existing.getShopId());
        existing.setDeletedAt(LocalDateTime.now());
        existing.setUpdatedBy(currentUserService.getCurrentUserIdOrNull());
        supplierRepository.save(existing);
        return ResponseEntity.ok(ApiResponse.success("Xóa nhà cung cấp thành công", null));
    }
}
