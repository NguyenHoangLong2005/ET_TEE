package com.ettee.opscore.common.exception;

import com.ettee.opscore.common.dto.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Bắt toàn bộ exception ở 1 nơi, trả về format lỗi nhất quán cho frontend xử lý.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private ResponseEntity<Object> build(HttpStatus status, String code, String message, Map<String, ?> details) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", false);
        body.put("errorCode", code);
        body.put("message", message);
        body.put("timestamp", Instant.now());
        if (details != null && !details.isEmpty()) body.put("details", details);
        return ResponseEntity.status(status).body(body);
    }

    @ExceptionHandler(AppExceptions.ResourceNotFoundException.class)
    public ResponseEntity<Object> handleNotFound(AppExceptions.ResourceNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage(), null);
    }

    @ExceptionHandler(AppExceptions.BusinessRuleViolationException.class)
    public ResponseEntity<Object> handleBusinessRule(AppExceptions.BusinessRuleViolationException ex) {
        return build(HttpStatus.BAD_REQUEST, "BUSINESS_RULE_VIOLATION", ex.getMessage(), null);
    }

    @ExceptionHandler(AppExceptions.ForbiddenActionException.class)
    public ResponseEntity<Object> handleForbiddenAction(AppExceptions.ForbiddenActionException ex) {
        return build(HttpStatus.FORBIDDEN, "FORBIDDEN", ex.getMessage(), null);
    }

    @ExceptionHandler(AppExceptions.StaleDataException.class)
    public ResponseEntity<Object> handleStaleData(AppExceptions.StaleDataException ex) {
        return build(HttpStatus.CONFLICT, "STALE_DATA", ex.getMessage(), null);
    }

    @ExceptionHandler(AppExceptions.AuthenticationFailedException.class)
    public ResponseEntity<Object> handleAuthFailed(AppExceptions.AuthenticationFailedException ex) {
        return build(HttpStatus.UNAUTHORIZED, "AUTH_FAILED", ex.getMessage(), null);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Object> handleBadCredentials(BadCredentialsException ex) {
        return build(HttpStatus.UNAUTHORIZED, "AUTH_FAILED", "Sai thông tin đăng nhập", null);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Object> handleAccessDenied(AccessDeniedException ex) {
        return build(HttpStatus.FORBIDDEN, "ACCESS_DENIED", "Bạn không có quyền thực hiện hành động này", null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Object> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", fieldErrors);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Object> handleConstraintViolation(ConstraintViolationException ex) {
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", ex.getMessage(), null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Object> handleDataIntegrity(DataIntegrityViolationException ex) {
        // Bắt lỗi vi phạm CHECK/UNIQUE/FK constraint từ chính schema Postgres (schema là nguồn sự thật).
        String rootMsg = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        return build(HttpStatus.CONFLICT, "DATA_INTEGRITY_VIOLATION", "Dữ liệu vi phạm ràng buộc CSDL: " + rootMsg, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleGeneric(Exception ex) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Lỗi hệ thống: " + ex.getMessage(), null);
    }
}
