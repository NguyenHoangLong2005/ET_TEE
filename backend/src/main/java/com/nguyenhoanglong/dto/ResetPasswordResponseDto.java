package com.nguyenhoanglong.dto;

public class ResetPasswordResponseDto {
    private String message;
    private boolean mustChangePassword;
    private String temporaryPassword;

    public ResetPasswordResponseDto() {}

    public ResetPasswordResponseDto(String message, boolean mustChangePassword, String temporaryPassword) {
        this.message = message;
        this.mustChangePassword = mustChangePassword;
        this.temporaryPassword = temporaryPassword;
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public boolean isMustChangePassword() { return mustChangePassword; }
    public void setMustChangePassword(boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }

    public String getTemporaryPassword() { return temporaryPassword; }
    public void setTemporaryPassword(String temporaryPassword) { this.temporaryPassword = temporaryPassword; }

    public static ResetPasswordResponseDtoBuilder builder() { return new ResetPasswordResponseDtoBuilder(); }

    public static class ResetPasswordResponseDtoBuilder {
        private String message;
        private boolean mustChangePassword;
        private String temporaryPassword;

        public ResetPasswordResponseDtoBuilder message(String message) { this.message = message; return this; }
        public ResetPasswordResponseDtoBuilder mustChangePassword(boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; return this; }
        public ResetPasswordResponseDtoBuilder temporaryPassword(String temporaryPassword) { this.temporaryPassword = temporaryPassword; return this; }

        public ResetPasswordResponseDto build() {
            return new ResetPasswordResponseDto(message, mustChangePassword, temporaryPassword);
        }
    }
}
