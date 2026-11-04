package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.config.SingleShop;
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
 * Thong tin cua hang. He thong chi quan ly mot cua hang (SingleShop):
 * /current la cach doc/sua chinh; /active giu lai cho client cu.
 */
@RestController
@RequestMapping("/api/shops")
public class ShopController {

    private final ShopRepository shopRepository;

    public ShopController(ShopRepository shopRepository) {
        this.shopRepository = shopRepository;
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<ShopDto>>> listActiveShops() {
        List<ShopDto> shops = shopRepository.findByIsActiveTrue().stream()
                .sorted((a, b) -> a.getId().compareTo(b.getId()))
                .map(s -> new ShopDto(s.getId(), s.getName(), s.getAddress(), s.getPhone(),
                        s.getIsActive(), s.getCreatedAt(), s.getUpdatedAt()))
                .toList();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách chi nhánh đang hoạt động thành công", shops));
    }

    /** Thong tin cua hang duy nhat (cong khai: trang Lien he, chan trang, app). */
    @GetMapping("/current")
    public ResponseEntity<ApiResponse<ShopDto>> getCurrentShop() {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin cửa hàng thành công", toDto(loadCurrent())));
    }

    /** Chu cua hang (hoac ADMIN) sua ten, dia chi, so dien thoai cua cua hang. */
    @PutMapping("/current")
    @PreAuthorize("hasAnyRole('ADMIN','SHOP_OWNER')")
    public ResponseEntity<ApiResponse<ShopDto>> updateCurrentShop(@RequestBody ShopDto request) {
        Shop shop = loadCurrent();
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên cửa hàng không được để trống");
        }
        shop.setName(request.getName().trim());
        shop.setAddress(request.getAddress() != null ? request.getAddress().trim() : null);
        shop.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin cửa hàng thành công",
                toDto(shopRepository.save(shop))));
    }

    private Shop loadCurrent() {
        return shopRepository.findById(SingleShop.ID)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chưa cấu hình cửa hàng"));
    }

    private static ShopDto toDto(Shop s) {
        return new ShopDto(s.getId(), s.getName(), s.getAddress(), s.getPhone(),
                s.getIsActive(), s.getCreatedAt(), s.getUpdatedAt());
    }
}
