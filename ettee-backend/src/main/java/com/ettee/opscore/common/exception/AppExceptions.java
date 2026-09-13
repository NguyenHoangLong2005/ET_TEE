package com.ettee.opscore.common.exception;

/**
 * Tập hợp các exception nghiệp vụ dùng chung cho toàn hệ thống.
 * Gộp vào 1 file để gọn — mỗi exception vẫn là 1 class riêng, độc lập.
 */
public class AppExceptions {

    /** Không tìm thấy entity (404). */
    public static class ResourceNotFoundException extends RuntimeException {
        public ResourceNotFoundException(String entity, Object id) {
            super(entity + " không tồn tại (id=" + id + ")");
        }
        public ResourceNotFoundException(String message) {
            super(message);
        }
    }

    /** Vi phạm ràng buộc/luật nghiệp vụ (400). Ví dụ: duyệt đơn của chính mình. */
    public static class BusinessRuleViolationException extends RuntimeException {
        public BusinessRuleViolationException(String message) {
            super(message);
        }
    }

    /** Không có quyền thực hiện hành động (403) ngoài phạm vi @PreAuthorize. */
    public static class ForbiddenActionException extends RuntimeException {
        public ForbiddenActionException(String message) {
            super(message);
        }
    }

    /** Dữ liệu bị thay đổi bởi người khác trong lúc xử lý (optimistic lock / version mismatch). */
    public static class StaleDataException extends RuntimeException {
        public StaleDataException(String message) {
            super(message);
        }
    }

    /** Xác thực sai (401) - sai tài khoản/mật khẩu, token hết hạn... */
    public static class AuthenticationFailedException extends RuntimeException {
        public AuthenticationFailedException(String message) {
            super(message);
        }
    }
}
