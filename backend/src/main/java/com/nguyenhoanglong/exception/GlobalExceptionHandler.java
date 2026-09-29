package com.nguyenhoanglong.exception;

import com.nguyenhoanglong.dto.ApiResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;
import com.nguyenhoanglong.exception.ApiException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceNotFoundException(ResourceNotFoundException ex) {
        ApiResponse<Void> response = ApiResponse.error(ex.getMessage());
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationException(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.put(error.getField(), error.getDefaultMessage());
        }
        ApiResponse<Map<String, String>> response = ApiResponse.error("Validation failed", errors);
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolationException(DataIntegrityViolationException ex) {
        String cause = ex.getMostSpecificCause().getMessage();
        String causeLower = cause != null ? cause.toLowerCase() : "";
        String message;
        // Nhan dien vi pham cac unique index/constraint hay gap thay vi in nguyen
        // van loi Postgres (lo ten cot, ten constraint noi bo ra ngoai).
        if (causeLower.contains("idx_users_email_lower") || causeLower.contains("uk6dotkott2kjsp8vw4d0m25fb7")
                || causeLower.contains("users_email_key") || causeLower.contains("email")) {
            message = "Email đã được sử dụng";
        } else if (causeLower.contains("employee_code")) {
            message = "Mã nhân viên đã tồn tại";
        } else {
            message = "Dữ liệu bị trùng hoặc vi phạm ràng buộc, vui lòng kiểm tra lại";
        }
        ApiResponse<Void> response = ApiResponse.error(message);
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiResponse<Void>> handleApiException(ApiException ex) {
        ApiResponse<Void> response = ApiResponse.error(ex.getMessage());
        return new ResponseEntity<>(response, ex.getStatus());
    }

    /**
     * Handle ResponseStatusException explicitly so that errors thrown via
     * `throw new ResponseStatusException(BAD_REQUEST, "msg")` propagate
     * with the intended status code instead of being caught by the generic
     * 500 handler.
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponse<Void>> handleResponseStatusException(ResponseStatusException ex) {
        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
        if (status == null) status = HttpStatus.INTERNAL_SERVER_ERROR;
        ApiResponse<Void> response = ApiResponse.error(ex.getReason() != null ? ex.getReason() : ex.getMessage());
        return new ResponseEntity<>(response, status);
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(org.springframework.security.access.AccessDeniedException ex) {
        ApiResponse<Void> response = ApiResponse.error("Không có quyền truy cập: " + ex.getMessage());
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgumentException(IllegalArgumentException ex) {
        ApiResponse<Void> response = ApiResponse.error(ex.getMessage());
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        // Loi that (stack trace, thong diep SQL/noi bo) chi ghi log server-side.
        // Tra nguyen van ex.getMessage() ra client la mot kenh lo thong tin
        // (ten cot, cau truy van, duong dan noi bo) cho bat ky loi khong luong
        // truoc nao.
        log.error("Unhandled exception", ex);
        ApiResponse<Void> response = ApiResponse.error("Đã có lỗi xảy ra ở máy chủ. Vui lòng thử lại sau.");
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
