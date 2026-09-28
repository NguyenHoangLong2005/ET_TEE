package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.ApiResponse;
import com.nguyenhoanglong.dto.ShopDto;
import com.nguyenhoanglong.entity.Shop;
import com.nguyenhoanglong.repository.ShopRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Danh sach chi nhanh DANG HOAT DONG, dung cho dropdown chon chi nhanh (vi
 * du ADMIN chon chi nhanh khi tao nhan vien). Chi doc, khong yeu cau quyen
 * dac biet ngoai da dang nhap (endpoint /api/** mac dinh yeu cau xac thuc -
 * xem SecurityConfig). Quan ly (tao/sua) o AdminShopController.
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
}
