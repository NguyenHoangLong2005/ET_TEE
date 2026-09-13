package com.ettee.opscore.catalog.dto;

import java.util.List;
import java.util.UUID;

public record CategoryDto(
        UUID id,
        UUID parentId,
        String name,
        String slug,
        String description,
        String imageUrl,
        boolean active,
        int sortOrder,
        List<CategoryDto> children
) {
}
