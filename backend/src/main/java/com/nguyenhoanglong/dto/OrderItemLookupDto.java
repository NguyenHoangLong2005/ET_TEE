package com.nguyenhoanglong.dto;

public class OrderItemLookupDto {
    private String productName;
    private String size;
    private String color;
    private Integer quantity;
    private Double price;

    public OrderItemLookupDto() {}

    public OrderItemLookupDto(String productName, String size, String color, Integer quantity, Double price) {
        this.productName = productName;
        this.size = size;
        this.color = color;
        this.quantity = quantity;
        this.price = price;
    }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getSize() { return size; }
    public void setSize(String size) { this.size = size; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }
}
