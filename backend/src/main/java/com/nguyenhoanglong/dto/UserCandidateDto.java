package com.nguyenhoanglong.dto;

public class UserCandidateDto {
    private String id;
    private String fullName;
    private String email;
    private String role;
    private Long shopId;

    public UserCandidateDto() {}

    public UserCandidateDto(String id, String fullName, String email, String role, Long shopId) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.role = role;
        this.shopId = shopId;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Long getShopId() { return shopId; }
    public void setShopId(Long shopId) { this.shopId = shopId; }
}
