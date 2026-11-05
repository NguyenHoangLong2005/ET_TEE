package com.nguyenhoanglong.service;

import com.nguyenhoanglong.config.UploadConfig;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.UUID;

/**
 * Luu anh vao thu muc upload (UploadConfig), phuc vu cong khai o /api/uploads/{folder}/{ten}.
 * Dung chung cho anh san pham va anh bang chung giao hang. Kieu anh xac dinh tu byte dau tep,
 * khong tin ten tep / content-type client gui.
 */
@Service
public class ImageStorageService {

    public static final long MAX_BYTES = 5L * 1024 * 1024;

    private final UploadConfig uploadConfig;

    public ImageStorageService(UploadConfig uploadConfig) {
        this.uploadConfig = uploadConfig;
    }

    /** Luu anh tai len; tra ve URL tuong doi (/api/uploads/...). */
    public String store(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chưa chọn tệp ảnh");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ảnh quá lớn (tối đa 5MB)");
        }
        try (InputStream in = file.getInputStream()) {
            return store(in.readAllBytes(), folder);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không đọc được tệp ảnh");
        }
    }

    /** Luu anh tu byte (vd anh mau cho du lieu demo); tra ve URL tuong doi. */
    public String store(byte[] bytes, String folder) {
        String ext = detectExtension(Arrays.copyOf(bytes, Math.min(bytes.length, 12)));
        if (ext == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF");
        }
        String name = UUID.randomUUID() + "." + ext;
        Path dir = uploadConfig.getUploadRoot().resolve(folder);
        try {
            Files.createDirectories(dir);
            Files.write(dir.resolve(name), bytes);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không lưu được ảnh, vui lòng thử lại");
        }
        return "/api/uploads/" + folder + "/" + name;
    }

    static String detectExtension(byte[] h) {
        if (h.length >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) return "jpg";
        if (h.length >= 8 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G') return "png";
        if (h.length >= 6 && h[0] == 'G' && h[1] == 'I' && h[2] == 'F' && h[3] == '8') return "gif";
        if (h.length >= 12 && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') return "webp";
        return null;
    }
}
