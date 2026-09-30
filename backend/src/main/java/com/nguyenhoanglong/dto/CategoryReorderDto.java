package com.nguyenhoanglong.dto;

import jakarta.validation.constraints.NotNull;

public class CategoryReorderDto {
    @NotNull(message = "ID category is required")
    private Long id;

    @NotNull(message = "displayOrder is required")
    private Integer displayOrder;

    public CategoryReorderDto() {}

    public CategoryReorderDto(Long id, Integer displayOrder) {
        this.id = id;
        this.displayOrder = displayOrder;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
}
