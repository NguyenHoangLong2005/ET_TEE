package com.nguyenhoanglong.dto;

import java.time.LocalDate;

public class ShopWorkShiftCreateDto {
    private String userId;
    private LocalDate shiftDate;
    private String shiftType;
    private String note;
    private String status;

    public ShopWorkShiftCreateDto() {}

    public ShopWorkShiftCreateDto(String userId, LocalDate shiftDate, String shiftType, String note, String status) {
        this.userId = userId;
        this.shiftDate = shiftDate;
        this.shiftType = shiftType;
        this.note = note;
        this.status = status;
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public LocalDate getShiftDate() { return shiftDate; }
    public void setShiftDate(LocalDate shiftDate) { this.shiftDate = shiftDate; }
    public String getShiftType() { return shiftType; }
    public void setShiftType(String shiftType) { this.shiftType = shiftType; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
