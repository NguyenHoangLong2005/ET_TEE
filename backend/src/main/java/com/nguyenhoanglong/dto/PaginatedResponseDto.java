package com.nguyenhoanglong.dto;

import java.util.List;
import java.util.Map;

public class PaginatedResponseDto<T> {
    private List<T> items;
    private long totalItems;
    private int currentPage;
    private int pageSize;
    private int totalPages;
    private Map<String, Object> filtersAvailable;

    public PaginatedResponseDto() {}

    public PaginatedResponseDto(List<T> items, long totalItems, int currentPage, int pageSize, int totalPages, Map<String, Object> filtersAvailable) {
        this.items = items;
        this.totalItems = totalItems;
        this.currentPage = currentPage;
        this.pageSize = pageSize;
        this.totalPages = totalPages;
        this.filtersAvailable = filtersAvailable;
    }

    public List<T> getItems() { return items; }
    public void setItems(List<T> items) { this.items = items; }

    public long getTotalItems() { return totalItems; }
    public void setTotalItems(long totalItems) { this.totalItems = totalItems; }

    public int getCurrentPage() { return currentPage; }
    public void setCurrentPage(int currentPage) { this.currentPage = currentPage; }

    public int getPageSize() { return pageSize; }
    public void setPageSize(int pageSize) { this.pageSize = pageSize; }

    public int getTotalPages() { return totalPages; }
    public void setTotalPages(int totalPages) { this.totalPages = totalPages; }

    public Map<String, Object> getFiltersAvailable() { return filtersAvailable; }
    public void setFiltersAvailable(Map<String, Object> filtersAvailable) { this.filtersAvailable = filtersAvailable; }
}
