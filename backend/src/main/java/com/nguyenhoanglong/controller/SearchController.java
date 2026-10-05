package com.nguyenhoanglong.controller;

import com.nguyenhoanglong.dto.ApiResponse;
import com.nguyenhoanglong.service.SemanticSearchService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Set;

/** Sprint 5: natural-language search and search by photo (storefront, guests included). */
@RestController
@RequestMapping("/api/search")
public class SearchController {

    static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024;
    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final SemanticSearchService searchService;

    public SearchController(SemanticSearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<SemanticSearchService.SearchResult>> search(
            @RequestParam String q, @RequestParam(defaultValue = "24") int limit) {
        return ResponseEntity.ok(ApiResponse.success(searchService.search(q, Math.max(1, Math.min(limit, 48)))));
    }

    @PostMapping(value = "/image", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<SemanticSearchService.SearchResult>> searchByImage(
            @RequestParam("file") MultipartFile file, @RequestParam(defaultValue = "24") int limit) throws IOException {
        if (file.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chưa chọn ảnh");
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Ảnh tối đa 5 MB");
        }
        if (file.getContentType() == null || !IMAGE_TYPES.contains(file.getContentType().toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ nhận ảnh JPG, PNG hoặc WEBP");
        }
        var result = searchService.searchByImage(file.getBytes(), file.getOriginalFilename(), file.getContentType(),
                Math.max(1, Math.min(limit, 48)));
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
