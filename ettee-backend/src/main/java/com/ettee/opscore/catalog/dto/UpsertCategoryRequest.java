package com.ettee.opscore.catalog.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record UpsertCategoryRequest(
        UUID parentId,
        @NotBlank(message = "Tên danh mục không được để trống") String name,
        @NotBlank(message = "Slug không được để trống") String slug,
        String description,
        String imageUrl,
        Boolean active,
        Integer sortOrder
) {
}
