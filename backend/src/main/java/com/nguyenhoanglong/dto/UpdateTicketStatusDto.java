package com.nguyenhoanglong.dto;

import jakarta.validation.constraints.NotBlank;

public class UpdateTicketStatusDto {
    @NotBlank(message = "Trạng thái mới không được để trống")
    private String status;
    private String note;

    public UpdateTicketStatusDto() {}

    public UpdateTicketStatusDto(String status, String note) {
        this.status = status;
        this.note = note;
    }

    public static UpdateTicketStatusDtoBuilder builder() {
        return new UpdateTicketStatusDtoBuilder();
    }

    public static class UpdateTicketStatusDtoBuilder {
        private String status;
        private String note;

        public UpdateTicketStatusDtoBuilder status(String status) { this.status = status; return this; }
        public UpdateTicketStatusDtoBuilder note(String note) { this.note = note; return this; }

        public UpdateTicketStatusDto build() {
            return new UpdateTicketStatusDto(status, note);
        }
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
