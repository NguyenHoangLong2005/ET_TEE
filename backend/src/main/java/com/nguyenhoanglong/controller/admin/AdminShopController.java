package com.nguyenhoanglong.controller.admin;

import com.nguyenhoanglong.dto.ApiResponse;
import com.nguyenhoanglong.dto.ShopDto;
import com.nguyenhoanglong.entity.Shop;
import com.nguyenhoanglong.repository.ShopRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Quan ly chi nhanh (Shop) - chi ADMIN duoc tao/sua. Xem
 * {@link com.nguyenhoanglong.controller.ShopController} cho endpoint doc
 * dung chung (danh sach chi nhanh dang hoat dong, dung cho dropdown chon chi
 * nhanh khi ADMIN tao nhan vien).
 *
 * Chua co nghiep vu XOA chi nhanh: mot chi nhanh co orders/users/inventories
 * tham chieu toi khong the xoa an toan qua API don gian; "ngung hoat dong"
 * (isActive=false) la cach dung de loai bo mot chi nhanh khoi luu hanh ma
 * khong mat du lieu lich su - dung nhu cach chi nhanh 2 (du lieu thu nghiem)
 * duoc xu ly trong migration Giai doan 0.
 */
@RestController
@RequestMapping("/api/admin/shops")
@PreAuthorize("hasRole('ADMIN')")
public class AdminShopController {

    private final ShopRepository shopRepository;

    public AdminShopController(ShopRepository shopRepository) {
        this.shopRepository = shopRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ShopDto>>> listShops() {
        List<ShopDto> shops = shopRepository.findAll().stream()
                .sorted((a, b) -> a.getId().compareTo(b.getId()))
                .map(this::toDto)
                .toList();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách chi nhánh thành công", shops));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ShopDto>> getShop(@PathVariable Long id) {
        Shop shop = shopRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chi nhánh"));
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin chi nhánh thành công", toDto(shop)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ShopDto>> createShop(@RequestBody ShopDto request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên chi nhánh không được để trống");
        }
        Shop shop = new Shop();
        shop.setName(request.getName().trim());
        shop.setAddress(request.getAddress() != null ? request.getAddress().trim() : null);
        shop.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        shop.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
        Shop saved = shopRepository.save(shop);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo chi nhánh thành công", toDto(saved)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ShopDto>> updateShop(@PathVariable Long id, @RequestBody ShopDto request) {
        Shop shop = shopRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chi nhánh"));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            shop.setName(request.getName().trim());
        }
        // Dia chi/dien thoai duoc phep dat rong (tru ve null) khac voi "khong gui"
        // (khong doi) - dung request co chua field hay khong de phan biet la vuot
        // qua kha nang cua kieu du lieu don gian nay; chap nhan client luon gui
        // du ca hai truong khi sua (form sua chi nhanh gui nguyen doi tuong).
        shop.setAddress(request.getAddress() != null ? request.getAddress().trim() : null);
        shop.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        if (request.getIsActive() != null) {
            shop.setIsActive(request.getIsActive());
        }

        Shop updated = shopRepository.save(shop);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật chi nhánh thành công", toDto(updated)));
    }

    private ShopDto toDto(Shop s) {
        return new ShopDto(s.getId(), s.getName(), s.getAddress(), s.getPhone(), s.getIsActive(),
                s.getCreatedAt(), s.getUpdatedAt());
    }
}
