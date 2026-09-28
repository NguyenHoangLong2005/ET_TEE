package com.nguyenhoanglong.dto;

import jakarta.validation.constraints.NotBlank;

public class OrderLookupRequestDto {

    @NotBlank(message = "Loại tìm kiếm không được để trống")
    private String searchType; // "PHONE" or "ORDER_CODE"

    @NotBlank(message = "Từ khóa tìm kiếm không được để trống")
    private String query;

    public OrderLookupRequestDto() {}

    public OrderLookupRequestDto(String searchType, String query) {
        this.searchType = searchType;
        this.query = query;
    }

    public String getSearchType() { return searchType; }
    public void setSearchType(String searchType) { this.searchType = searchType; }

    public String getQuery() { return query; }
    public void setQuery(String query) { this.query = query; }
}
