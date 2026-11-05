package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.service.ImageStorageService;
import com.nguyenhoanglong.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * Uploads a product image and returns the URL to store in product_images.image_url.
 * The type is decided from the file's magic bytes, never from the client-supplied
 * name or content type, and the stored name is a random UUID.
 */
@RestController
@RequestMapping("/api/store-owner/uploads")
public class StoreOwnerUploadController {


    private final ImageStorageService imageStorage;

    public StoreOwnerUploadController(ImageStorageService imageStorage) {
        this.imageStorage = imageStorage;
    }

    @PostMapping("/product-image")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadProductImage(@RequestParam("file") MultipartFile file) {
        String url = imageStorage.store(file, "products");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đã tải ảnh lên", Map.of("url", url)));
    }
}
