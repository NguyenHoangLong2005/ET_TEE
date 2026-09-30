package com.nguyenhoanglong.util;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.stream.Collectors;

/**
 * Input Validation and Sanitization Utility
 * Centralizes all input validation and sanitization
 */
@Component
public class InputValidator {

    private final Validator validator;

    public InputValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        this.validator = factory.getValidator();
    }

    /**
     * Validate an object using Jakarta Validation annotations
     */
    public <T> ValidationResult validate(T object) {
        Set<ConstraintViolation<T>> violations = validator.validate(object);
        
        if (violations.isEmpty()) {
            return ValidationResult.success();
        }
        
        Set<String> errors = violations.stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .collect(Collectors.toSet());
        
        return ValidationResult.failure(errors);
    }

    /**
     * Sanitize string input - remove potential XSS characters
     */
    public String sanitize(String input) {
        if (input == null) {
            return null;
        }
        
        return input
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll("\"", "&quot;")
                .replaceAll("'", "&#x27;")
                .replaceAll("/", "&#x2F;")
                .trim();
    }

    /**
     * Validate email format
     */
    public boolean isValidEmail(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        return email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");
    }

    /**
     * Validate phone number format (Vietnam)
     */
    public boolean isValidPhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return false;
        }
        // Accept formats: 0123456789, 0123 456 789, 0123-456-789, +84123456789
        return phone.matches("^(\\+84|0)[1-9][0-9]{8}$");
    }

    /**
     * Validate order code format
     */
    public boolean isValidOrderCode(String code) {
        if (code == null || code.isBlank()) {
            return false;
        }
        return code.matches("^[A-Z0-9]{10,20}$");
    }

    /**
     * Validate voucher code format
     */
    public boolean isValidVoucherCode(String code) {
        if (code == null || code.isBlank()) {
            return false;
        }
        return code.matches("^[A-Z0-9]{4,20}$");
    }

    /**
     * Sanitize search query
     */
    public String sanitizeSearchQuery(String query) {
        if (query == null) {
            return null;
        }
        return query
                .replaceAll("[<>\"']", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    /**
     * Validate ID (must be positive Long)
     */
    public boolean isValidId(Long id) {
        return id != null && id > 0;
    }

    /**
     * Validate pagination parameters
     */
    public PaginationParams validatePagination(Integer page, Integer size, Integer maxSize) {
        int validPage = (page == null || page < 0) ? 0 : page;
        int validSize = (size == null || size < 1) ? 20 : Math.min(size, maxSize);
        return new PaginationParams(validPage, validSize);
    }

    public record ValidationResult(boolean valid, Set<String> errors) {
        public static ValidationResult success() {
            return new ValidationResult(true, Set.of());
        }
        
        public static ValidationResult failure(Set<String> errors) {
            return new ValidationResult(false, errors);
        }
    }

    public record PaginationParams(int page, int size) {}
}
