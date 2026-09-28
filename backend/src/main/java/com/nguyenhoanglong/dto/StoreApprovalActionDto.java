package com.nguyenhoanglong.dto;

public class StoreApprovalActionDto {
    private String type; // VOUCHER | INVENTORY_ADJUSTMENT
    private String action; // APPROVED | REJECTED
    private String note;

    public StoreApprovalActionDto() {}

    public StoreApprovalActionDto(String type, String action, String note) {
        this.type = type;
        this.action = action;
        this.note = note;
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
