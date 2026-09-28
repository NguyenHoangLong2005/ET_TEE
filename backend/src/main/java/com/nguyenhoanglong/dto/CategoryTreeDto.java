package com.nguyenhoanglong.dto;

import java.util.ArrayList;
import java.util.List;

public class CategoryTreeDto {
    private Long id;
    private String name;
    private String slug;
    private String description;
    private String imageUrl;
    private Long parentId;
    private Integer displayOrder;
    private Boolean active;
    private List<CategoryTreeDto> children = new ArrayList<>();

    public CategoryTreeDto() {}

    public CategoryTreeDto(Long id, String name, String slug, String description, String imageUrl, Long parentId, Integer displayOrder, Boolean active) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.description = description;
        this.imageUrl = imageUrl;
        this.parentId = parentId;
        this.displayOrder = displayOrder;
        this.active = active;
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

    public List<CategoryTreeDto> getChildren() { return children; }
    public void setChildren(List<CategoryTreeDto> children) { this.children = children; }
}
