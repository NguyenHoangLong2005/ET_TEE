package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.config.UploadConfig;
import com.nguyenhoanglong.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

/**
 * Uploads a product image and returns the URL to store in product_images.image_url.
 * The type is decided from the file's magic bytes, never from the client-supplied
 * name or content type, and the stored name is a random UUID.
 */
@RestController
@RequestMapping("/api/store-owner/uploads")
public class StoreOwnerUploadController {

    private static final long MAX_BYTES = 5L * 1024 * 1024;

    private final UploadConfig uploadConfig;

    public StoreOwnerUploadController(UploadConfig uploadConfig) {
        this.uploadConfig = uploadConfig;
    }

    @PostMapping("/product-image")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadProductImage(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chưa chọn tệp ảnh");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ảnh quá lớn (tối đa 5MB)");
        }

        String ext;
        try (InputStream in = file.getInputStream()) {
            byte[] head = in.readNBytes(12);
            ext = detectExtension(head);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không đọc được tệp ảnh");
        }
        if (ext == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF");
        }

        String name = UUID.randomUUID() + "." + ext;
        Path dir = uploadConfig.getUploadRoot().resolve("products");
        try {
            Files.createDirectories(dir);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, dir.resolve(name));
            }
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không lưu được ảnh, vui lòng thử lại");
        }

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đã tải ảnh lên", Map.of("url", "/api/uploads/products/" + name)));
    }

    private static String detectExtension(byte[] h) {
        if (h.length >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) return "jpg";
        if (h.length >= 8 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G') return "png";
        if (h.length >= 6 && h[0] == 'G' && h[1] == 'I' && h[2] == 'F' && h[3] == '8') return "gif";
        if (h.length >= 12 && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') return "webp";
        return null;
    }
}
