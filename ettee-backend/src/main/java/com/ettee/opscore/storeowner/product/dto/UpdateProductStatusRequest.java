package com.ettee.opscore.storeowner.product.dto;

import com.ettee.opscore.storeowner.product.entity.ProductStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateProductStatusRequest(@NotNull ProductStatus status) {
}
