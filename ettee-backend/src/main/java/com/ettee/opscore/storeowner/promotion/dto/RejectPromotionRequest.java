package com.ettee.opscore.storeowner.promotion.dto;

import jakarta.validation.constraints.NotBlank;

public record RejectPromotionRequest(@NotBlank(message = "Vui lòng nêu lý do từ chối") String reason) {
}
