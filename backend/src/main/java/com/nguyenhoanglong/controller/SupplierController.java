package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.ApiResponse;
import com.nguyenhoanglong.dto.PaginatedResponseDto;
import com.nguyenhoanglong.entity.Supplier;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.repository.ProductRepository;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Nha cung ung: shop_id NULL = dung chung toan chuoi (chi ADMIN sua/xoa, moi
 * SHOP_OWNER van XEM va CHON duoc khi nhap hang); shop_id co gia tri = rieng
 * cua mot chi nhanh (SHOP_OWNER cua dung chi nhanh do duoc CRUD toan quyen).
 *
 * "So san pham" duoc dem that theo products.supplier_id, va mot nha cung ung con
 * san pham dang dung thi khong xoa duoc.
 */
@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern PHONE = Pattern.compile("^\\+?[0-9]{8,15}$");

    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;
    private final CurrentUserService currentUserService;
    private final StoreAccessGuard storeAccessGuard;

    public SupplierController(SupplierRepository supplierRepository,
                               ProductRepository productRepository,
                               CurrentUserService currentUserService,
                               StoreAccessGuard storeAccessGuard) {
        this.supplierRepository = supplierRepository;
        this.productRepository = productRepository;
        this.currentUserService = currentUserService;
        this.storeAccessGuard = storeAccessGuard;
    }

    public record SupplierView(Long id, String name, String address, String phone, String email,
                               String productType, String description, Long shopId, long productCount,
                               LocalDateTime createdAt) {}

    private SupplierView toView(Supplier s) {
        return new SupplierView(s.getId(), s.getName(), s.getAddress(), s.getPhone(), s.getEmail(),
                s.getProductType(), s.getDescription(), s.getShopId(),
                productRepository.countBySupplierId(s.getId()), s.getCreatedAt());
    }

    private static String clean(String s) {
        return s == null || s.trim().isEmpty() ? null : s.trim();
    }

    private static ResponseStatusException bad(String m) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, m);
    }

    /** Validates the writable fields. `shopId` is the scope the record lives in (null = shared). */
    private void validate(Supplier r, Long shopId, Long selfId) {
        String name = clean(r.getName());
        if (name == null) throw bad("Tên nhà cung cấp không được để trống");
        if (name.length() > 255) throw bad("Tên nhà cung cấp tối đa 255 ký tự");
        String email = clean(r.getEmail());
        if (email != null && (email.length() > 150 || !EMAIL.matcher(email).matches())) {
            throw bad("Email nhà cung cấp không đúng định dạng");
        }
        String phone = clean(r.getPhone());
        if (phone != null && !PHONE.matcher(phone.replaceAll("[\\s.()-]", "")).matches()) {
            throw bad("Số điện thoại không hợp lệ (8–15 chữ số)");
        }
        String address = clean(r.getAddress());
        if (address != null && address.length() > 255) throw bad("Địa chỉ tối đa 255 ký tự");
        String type = clean(r.getProductType());
        if (type != null && type.length() > 150) throw bad("Loại hàng tối đa 150 ký tự");
        boolean duplicate = selfId == null
                ? supplierRepository.existsByNameIgnoreCaseAndShopId(name, shopId)
                : supplierRepository.existsByNameIgnoreCaseAndShopIdAndIdNot(name, shopId, selfId);
        if (duplicate) throw new ResponseStatusException(HttpStatus.CONFLICT, "Nhà cung cấp cùng tên đã tồn tại");
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN', 'WAREHOUSE_STAFF')")
    public ResponseEntity<ApiResponse<PaginatedResponseDto<SupplierView>>> getSuppliers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String keyword) {

        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        // "" (never null) = no filter; a null bind param breaks LOWER(CONCAT(..)) on PostgreSQL.
        String cleanKeyword = keyword != null ? keyword.trim() : "";

        User user = currentUserService.getCurrentUser();
        Page<Supplier> pagedResult;
        if (currentUserService.isAdmin()) {
            // ADMIN thay tat ca: dung chung + moi chi nhanh.
            pagedResult = supplierRepository.searchSuppliers(cleanKeyword, pageable);
        } else {
            // SHOP_OWNER/WAREHOUSE_STAFF: dung chung (shop_id NULL) + rieng chi nhanh minh.
            pagedResult = supplierRepository.searchSuppliersVisibleToShop(cleanKeyword, user.getShopId(), pageable);
        }

        PaginatedResponseDto<SupplierView> responseDto = new PaginatedResponseDto<>(
                pagedResult.getContent().stream().map(this::toView).toList(),
                pagedResult.getTotalElements(),
                pagedResult.getNumber(),
                pagedResult.getSize(),
                pagedResult.getTotalPages(),
                null
        );

        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách nhà cung cấp thành công", responseDto));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN', 'WAREHOUSE_STAFF')")
    public ResponseEntity<ApiResponse<SupplierView>> getSupplierById(@PathVariable Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhà cung cấp"));
        if (supplier.getShopId() != null) {
            // Nha cung ung rieng chi nhanh: chi ADMIN hoac dung chi nhanh do duoc xem.
            storeAccessGuard.assertOwnsShop(supplier.getShopId());
        }
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin nhà cung cấp thành công", toView(supplier)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<SupplierView>> createSupplier(@RequestBody Supplier request) {
        // shopId cua request KHONG duoc tin: SHOP_OWNER luon tao vao chi
        // nhanh cua chinh ho; ADMIN duoc chi dinh (null = dung chung).
        Long shopId = currentUserService.resolveShopIdForWrite(request.getShopId());
        validate(request, shopId, null);

        Supplier newEntity = new Supplier(
                request.getName().trim(),
                clean(request.getAddress()),
                clean(request.getPhone()),
                clean(request.getEmail()),
                clean(request.getProductType()) != null ? clean(request.getProductType()) : "Phụ liệu may mặc",
                clean(request.getDescription())
        );
        newEntity.setShopId(shopId);
        String actor = currentUserService.getCurrentUserIdOrNull();
        newEntity.setCreatedBy(actor);
        newEntity.setUpdatedBy(actor);

        Supplier saved = supplierRepository.save(newEntity);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo mới nhà cung cấp thành công", toView(saved)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<SupplierView>> updateSupplier(
            @PathVariable Long id,
            @RequestBody Supplier request) {

        Supplier existing = supplierRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhà cung cấp"));
        // SHOP_OWNER sua duoc nha cung ung DUNG CHUNG (shopId null) va nha cung ung
        // RIENG cua chi nhanh minh, nhung khong sua duoc nha cung ung cua chi nhanh khac.
        if (existing.getShopId() != null) {
            storeAccessGuard.assertOwnsShopForWrite(existing.getShopId());
        }
        validate(request, existing.getShopId(), id);

        existing.setName(request.getName().trim());
        existing.setAddress(clean(request.getAddress()));
        existing.setPhone(clean(request.getPhone()));
        existing.setEmail(clean(request.getEmail()));
        existing.setProductType(clean(request.getProductType()));
        existing.setDescription(clean(request.getDescription()));
        // shopId cua nha cung ung khong doi qua request body: doi chi nhanh
        // cho mot nha cung ung la thao tac nhay cam, chua co nghiep vu cho no.
        existing.setUpdatedBy(currentUserService.getCurrentUserIdOrNull());

        Supplier updated = supplierRepository.save(existing);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin nhà cung cấp thành công", toView(updated)));
    }

    @GetMapping("/{id}/delete-check")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkDelete(@PathVariable Long id) {
        Supplier existing = supplierRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhà cung cấp"));
        return ResponseEntity.ok(ApiResponse.success("OK", deleteCheck(existing)));
    }

    private Map<String, Object> deleteCheck(Supplier s) {
        long products = productRepository.countBySupplierId(s.getId());
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("canDelete", products == 0);
        res.put("productCount", products);
        res.put("reason", products == 0 ? null
                : "Có " + products + " sản phẩm đang dùng nhà cung cấp này. Hãy chuyển các sản phẩm sang nhà cung cấp khác trước.");
        return res;
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteSupplier(@PathVariable Long id) {
        Supplier existing = supplierRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhà cung cấp"));
        storeAccessGuard.assertOwnsShopForWrite(existing.getShopId());
        Map<String, Object> check = deleteCheck(existing);
        if (!Boolean.TRUE.equals(check.get("canDelete"))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Không thể xóa nhà cung cấp. " + check.get("reason"));
        }
        existing.setDeletedAt(LocalDateTime.now());
        existing.setUpdatedBy(currentUserService.getCurrentUserIdOrNull());
        supplierRepository.save(existing);
        return ResponseEntity.ok(ApiResponse.success("Xóa nhà cung cấp thành công", null));
    }
}
