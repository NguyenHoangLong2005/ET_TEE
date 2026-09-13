package com.ettee.opscore.storeowner.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** "Điều chỉnh tồn kho" — nhân viên kho/chủ cửa hàng đề xuất, cần người KHÁC phê duyệt. */
public record CreateAdjustmentRequestDto(
        @NotNull UUID variantId,
        @NotNull UUID locationId,
        int quantityDiff,
        @NotBlank(message = "Vui lòng nêu lý do điều chỉnh") String reason
) {
}
