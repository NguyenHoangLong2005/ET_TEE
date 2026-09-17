package com.ettee.opscore.common.dto;

import java.time.Instant;

/**
 * Bọc mọi response thành công theo format thống nhất cho toàn bộ API.
 */
public record ApiResponse<T>(boolean success, T data, String message, Instant timestamp) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null, Instant.now());
    }

    public static <T> ApiResponse<T> ok(T data, String message) {
        return new ApiResponse<>(true, data, message, Instant.now());
    }

    public static ApiResponse<Void> message(String message) {
        return new ApiResponse<>(true, null, message, Instant.now());
    }
}
