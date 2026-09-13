package com.ettee.opscore.storeowner.inventory.dto;

import jakarta.validation.constraints.NotBlank;

public record RejectRequestDto(@NotBlank(message = "Vui lòng nêu lý do từ chối") String reason) {
}
