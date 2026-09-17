package com.ettee.opscore.cskh.returns.dto;

import com.ettee.opscore.cskh.returns.entity.ReturnStatus;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record HandleReturnRequestDto(@NotNull ReturnStatus newStatus, UUID replacementOrderId) {
}
