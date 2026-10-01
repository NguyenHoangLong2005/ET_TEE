package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.ApiResponse;
import com.nguyenhoanglong.dto.PaginatedResponseDto;
import com.nguyenhoanglong.entity.Manufacturer;
import com.nguyenhoanglong.repository.ManufacturerRepository;
import com.nguyenhoanglong.repository.ProductRepository;
import com.nguyenhoanglong.service.CurrentUserService;
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
import java.time.ZoneId;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Nha san xuat la du lieu DUNG CHUNG toan he thong. SHOP_OWNER va ADMIN duoc
 * them/sua/xoa; WAREHOUSE_STAFF chi xem (dung khi nhap hang).
 *
 * "So san pham" duoc DEM THAT theo products.manufacturer_id (nha san xuat duoc
 * chon trong form san pham), khong phai con so nhap tay. Truong brand cua san
 * pham la thuong hieu hien thi cho khach, khong lien quan den nha san xuat.
 */
@RestController
@RequestMapping("/api/manufacturers")
public class ManufacturerController {

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final ManufacturerRepository manufacturerRepository;
    private final ProductRepository productRepository;
    private final CurrentUserService currentUserService;

    public ManufacturerController(ManufacturerRepository manufacturerRepository,
                                  ProductRepository productRepository,
                                  CurrentUserService currentUserService) {
        this.manufacturerRepository = manufacturerRepository;
        this.productRepository = productRepository;
        this.currentUserService = currentUserService;
    }

    /** Response shape: entity fields + the real product count. */
    public record ManufacturerView(Long id, String name, String country, String website,
                                   String contactEmail, String description, long productCount,
                                   LocalDateTime createdAt, LocalDateTime updatedAt) {}

    private ManufacturerView toView(Manufacturer m) {
        long count = productRepository.countByManufacturerId(m.getId());
        return new ManufacturerView(m.getId(), m.getName(), m.getCountry(), m.getWebsite(),
                m.getContactEmail(), m.getDescription(), count, m.getCreatedAt(), m.getUpdatedAt());
    }

    private static String clean(String s) {
        return s == null ? null : (s.trim().isEmpty() ? null : s.trim());
    }

    /** Validates and normalises the writable fields; throws 400/409 with a Vietnamese message. */
    private void validate(Manufacturer request, Long selfId) {
        String name = clean(request.getName());
        if (name == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên nhà sản xuất không được để trống");
        }
        if (name.length() > 255) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên nhà sản xuất tối đa 255 ký tự");
        }
        String email = clean(request.getContactEmail());
        if (email != null && (email.length() > 150 || !EMAIL.matcher(email).matches())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email liên hệ không đúng định dạng");
        }
        String website = clean(request.getWebsite());
        if (website != null && website.length() > 255) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Website tối đa 255 ký tự");
        }
        String country = clean(request.getCountry());
        if (country != null && country.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quốc gia tối đa 100 ký tự");
        }
        boolean duplicate = selfId == null
                ? manufacturerRepository.existsByNameIgnoreCase(name)
                : manufacturerRepository.existsByNameIgnoreCaseAndIdNot(name, selfId);
        if (duplicate) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Nhà sản xuất cùng tên đã tồn tại");
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN', 'WAREHOUSE_STAFF')")
    public ResponseEntity<ApiResponse<PaginatedResponseDto<ManufacturerView>>> getManufacturers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String keyword) {

        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        // "" (never null) = no filter; a null bind param breaks LOWER(CONCAT(..)) on PostgreSQL.
        String cleanKeyword = keyword != null ? keyword.trim() : "";
        Page<Manufacturer> pagedResult = manufacturerRepository.searchManufacturers(cleanKeyword, pageable);

        List<ManufacturerView> items = pagedResult.getContent().stream().map(this::toView).toList();
        PaginatedResponseDto<ManufacturerView> responseDto = new PaginatedResponseDto<>(
                items,
                pagedResult.getTotalElements(),
                pagedResult.getNumber(),
                pagedResult.getSize(),
                pagedResult.getTotalPages(),
                null
        );

        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách nhà sản xuất thành công", responseDto));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN', 'WAREHOUSE_STAFF')")
    public ResponseEntity<ApiResponse<ManufacturerView>> getManufacturerById(@PathVariable Long id) {
        Manufacturer manufacturer = manufacturerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhà sản xuất"));
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin nhà sản xuất thành công", toView(manufacturer)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ManufacturerView>> createManufacturer(@RequestBody Manufacturer request) {
        validate(request, null);

        Manufacturer newEntity = new Manufacturer(
                request.getName().trim(),
                clean(request.getCountry()) != null ? clean(request.getCountry()) : "Việt Nam",
                clean(request.getWebsite()),
                clean(request.getContactEmail()),
                clean(request.getDescription()),
                0
        );
        String actor = currentUserService.getCurrentUserIdOrNull();
        newEntity.setCreatedBy(actor);
        newEntity.setUpdatedBy(actor);

        Manufacturer saved = manufacturerRepository.save(newEntity);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo mới nhà sản xuất thành công", toView(saved)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ManufacturerView>> updateManufacturer(
            @PathVariable Long id,
            @RequestBody Manufacturer request) {

        Manufacturer existing = manufacturerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhà sản xuất"));
        validate(request, id);

        existing.setName(request.getName().trim());
        existing.setCountry(clean(request.getCountry()) != null ? clean(request.getCountry()) : "Việt Nam");
        existing.setWebsite(clean(request.getWebsite()));
        existing.setContactEmail(clean(request.getContactEmail()));
        existing.setDescription(clean(request.getDescription()));
        existing.setUpdatedBy(currentUserService.getCurrentUserIdOrNull());

        Manufacturer updated = manufacturerRepository.save(existing);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin nhà sản xuất thành công", toView(updated)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteManufacturer(@PathVariable Long id) {
        // Xoa mem. Product khong co FK toi Manufacturer (chi co brand dang van ban),
        // nen viec xoa khong lam hong san pham; giao dien canh bao so san pham dang
        // mang thuong hieu nay truoc khi xoa.
        Manufacturer existing = manufacturerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhà sản xuất"));
        existing.setDeletedAt(LocalDateTime.now(ZoneId.systemDefault()));
        existing.setUpdatedBy(currentUserService.getCurrentUserIdOrNull());
        manufacturerRepository.save(existing);
        return ResponseEntity.ok(ApiResponse.success("Xóa nhà sản xuất thành công", null));
    }
}
