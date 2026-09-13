package com.ettee.opscore.storeowner.product.dto;

import com.ettee.opscore.storeowner.product.entity.GenderType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateProductRequest(
        @NotNull(message = "Vui lòng chọn danh mục") UUID categoryId,
        @NotBlank(message = "Tên sản phẩm không được để trống") String name,
        @NotBlank(message = "Slug không được để trống") String slug,
        String description,
        String brand,
        GenderType genderTarget,
        @NotNull @DecimalMin(value = "0", message = "Giá phải >= 0") BigDecimal basePrice
) {
}
