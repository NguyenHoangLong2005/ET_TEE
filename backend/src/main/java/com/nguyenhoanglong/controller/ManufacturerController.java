package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.ApiResponse;
import com.nguyenhoanglong.dto.PaginatedResponseDto;
import com.nguyenhoanglong.entity.Manufacturer;
import com.nguyenhoanglong.repository.ManufacturerRepository;
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
import java.util.List;

/**
 * Nha san xuat la du lieu DUNG CHUNG toan he thong: chi ADMIN duoc
 * them/sua/xoa (theo ma tran phan quyen Giai doan 2). SHOP_OWNER/WAREHOUSE_STAFF
 * chi duoc xem, dung khi nhap hang.
 */
@RestController
@RequestMapping("/api/manufacturers")
public class ManufacturerController {

    private final ManufacturerRepository manufacturerRepository;
    private final CurrentUserService currentUserService;

    public ManufacturerController(ManufacturerRepository manufacturerRepository, CurrentUserService currentUserService) {
        this.manufacturerRepository = manufacturerRepository;
        this.currentUserService = currentUserService;
    }

    private void seedDefaultsIfEmpty() {
        if (manufacturerRepository.count() == 0) {
            List<Manufacturer> defaults = List.of(
                new Manufacturer("Xưởng May Dệt Kim Hà Nội", "Việt Nam", "https://detkimhanoi.vn", "contact@detkimhanoi.vn", "Chuyên gia công áo thun 100% Cotton 2 chiều và 4 chiều định lượng 250gsm cho ET.TEE.", 18),
                new Manufacturer("Xưởng Gia Công May Mặc Sài Gòn Garment", "Việt Nam", "https://saigongarment.com", "orders@saigongarment.com", "Chuyên may quần jean, kaki túi hộp và áo khoác gió dù 2 lớp chuẩn form streetwear.", 24),
                new Manufacturer("Công Ty Cổ Phần May Đông Đô", "Việt Nam", "https://dongdogarment.vn", "info@dongdogarment.vn", "Đối tác sản xuất hoodie nỉ bông chân cua 380gsm và sơ mi oversize.", 15),
                new Manufacturer("Xưởng Thêu Vi Tính & In Kỹ Thuật Số Hải Phòng", "Việt Nam", "https://haiphongprint.vn", "xuongin@haiphongprint.vn", "Xưởng in lụa trame cao cấp và in kỹ thuật số DTG cho các mẫu áo Graphic Tee.", 12)
            );
            manufacturerRepository.saveAll(defaults);
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN', 'WAREHOUSE_STAFF')")
    public ResponseEntity<ApiResponse<PaginatedResponseDto<Manufacturer>>> getManufacturers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String keyword) {

        seedDefaultsIfEmpty();

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        String cleanKeyword = (keyword != null && !keyword.trim().isEmpty()) ? keyword.trim() : null;
        Page<Manufacturer> pagedResult = manufacturerRepository.searchManufacturers(cleanKeyword, pageable);

        PaginatedResponseDto<Manufacturer> responseDto = new PaginatedResponseDto<>(
                pagedResult.getContent(),
                (int) pagedResult.getTotalElements(),
                page,
                size,
                pagedResult.getTotalPages(),
                null
        );

        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách nhà sản xuất thành công", responseDto));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN', 'WAREHOUSE_STAFF')")
    public ResponseEntity<ApiResponse<Manufacturer>> getManufacturerById(@PathVariable Long id) {
        Manufacturer manufacturer = manufacturerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhà sản xuất"));
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin nhà sản xuất thành công", manufacturer));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Manufacturer>> createManufacturer(@RequestBody Manufacturer request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên nhà sản xuất không được để trống");
        }

        Manufacturer newEntity = new Manufacturer(
                request.getName().trim(),
                request.getCountry() != null && !request.getCountry().trim().isEmpty() ? request.getCountry().trim() : "Việt Nam",
                request.getWebsite() != null ? request.getWebsite().trim() : null,
                request.getContactEmail() != null ? request.getContactEmail().trim() : null,
                request.getDescription() != null ? request.getDescription().trim() : null,
                request.getProductCount() != null ? request.getProductCount() : 0
        );
        String actor = currentUserService.getCurrentUserIdOrNull();
        newEntity.setCreatedBy(actor);
        newEntity.setUpdatedBy(actor);

        Manufacturer saved = manufacturerRepository.save(newEntity);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo mới nhà sản xuất thành công", saved));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Manufacturer>> updateManufacturer(
            @PathVariable Long id,
            @RequestBody Manufacturer request) {

        Manufacturer existing = manufacturerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhà sản xuất"));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            existing.setName(request.getName().trim());
        }
        if (request.getCountry() != null) {
            existing.setCountry(request.getCountry().trim());
        }
        if (request.getWebsite() != null) {
            existing.setWebsite(request.getWebsite().trim());
        }
        if (request.getContactEmail() != null) {
            existing.setContactEmail(request.getContactEmail().trim());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription().trim());
        }
        if (request.getProductCount() != null) {
            existing.setProductCount(request.getProductCount());
        }

        existing.setUpdatedBy(currentUserService.getCurrentUserIdOrNull());

        Manufacturer updated = manufacturerRepository.save(existing);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin nhà sản xuất thành công", updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteManufacturer(@PathVariable Long id) {
        // Xoa mem: Product khong co lien ket FK toi Manufacturer (chi co truong
        // brand dang van ban tu do), nen KHONG the kiem tra "con san pham dang
        // dung" nhu voi Category. Neu ve sau them lien ket that, bo sung kiem
        // tra tai day truoc khi xoa.
        Manufacturer existing = manufacturerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhà sản xuất"));
        existing.setDeletedAt(LocalDateTime.now());
        existing.setUpdatedBy(currentUserService.getCurrentUserIdOrNull());
        manufacturerRepository.save(existing);
        return ResponseEntity.ok(ApiResponse.success("Xóa nhà sản xuất thành công", null));
    }
}
