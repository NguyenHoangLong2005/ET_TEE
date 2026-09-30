package com.nguyenhoanglong.dto;

import jakarta.validation.constraints.NotBlank;

public class CategoryDto {
    private Long id;

    @NotBlank(message = "Category name is required")
    private String name;

    private String slug;
    private String description;
    private String imageUrl;
    private Long parentId;
    private Integer displayOrder = 0;
    private Boolean active = true;

    public CategoryDto() {}

    public CategoryDto(Long id, String name, String slug, String description, String imageUrl, Long parentId, Integer displayOrder, Boolean active) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.description = description;
        this.imageUrl = imageUrl;
        this.parentId = parentId;
        this.displayOrder = displayOrder != null ? displayOrder : 0;
        this.active = active != null ? active : true;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public Long getParentId() { return parentId; }
    public void setParentId(Long parentId) { this.parentId = parentId; }

    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public static CategoryDtoBuilder builder() {
        return new CategoryDtoBuilder();
    }

    public static class CategoryDtoBuilder {
        private Long id;
        private String name;
        private String slug;
        private String description;
        private String imageUrl;
        private Long parentId;
        private Integer displayOrder = 0;
        private Boolean active = true;

        public CategoryDtoBuilder id(Long id) { this.id = id; return this; }
        public CategoryDtoBuilder name(String name) { this.name = name; return this; }
        public CategoryDtoBuilder slug(String slug) { this.slug = slug; return this; }
        public CategoryDtoBuilder description(String description) { this.description = description; return this; }
        public CategoryDtoBuilder imageUrl(String imageUrl) { this.imageUrl = imageUrl; return this; }
        public CategoryDtoBuilder parentId(Long parentId) { this.parentId = parentId; return this; }
        public CategoryDtoBuilder displayOrder(Integer displayOrder) { this.displayOrder = displayOrder; return this; }
        public CategoryDtoBuilder active(Boolean active) { this.active = active; return this; }

        public CategoryDto build() {
            return new CategoryDto(id, name, slug, description, imageUrl, parentId, displayOrder, active);
        }
    }
}
