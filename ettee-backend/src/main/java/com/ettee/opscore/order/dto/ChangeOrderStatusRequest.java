package com.ettee.opscore.order.dto;

import com.ettee.opscore.order.entity.OrderStatus;
import jakarta.validation.constraints.NotNull;

public record ChangeOrderStatusRequest(@NotNull OrderStatus status, @NotNull Long expectedVersion, String note) {
}