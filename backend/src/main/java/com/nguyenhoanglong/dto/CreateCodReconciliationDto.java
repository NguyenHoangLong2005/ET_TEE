package com.nguyenhoanglong.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public class CreateCodReconciliationDto {
    @NotEmpty(message = "Danh sách vận đơn đối soát không được để trống")
    private List<Long> shipmentIds;

    private String note;

    public CreateCodReconciliationDto() {}

    public CreateCodReconciliationDto(List<Long> shipmentIds, String note) {
        this.shipmentIds = shipmentIds;
        this.note = note;
    }

    public List<Long> getShipmentIds() { return shipmentIds; }
    public void setShipmentIds(List<Long> shipmentIds) { this.shipmentIds = shipmentIds; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
