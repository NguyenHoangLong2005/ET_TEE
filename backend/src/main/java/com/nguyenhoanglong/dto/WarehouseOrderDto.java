package com.nguyenhoanglong.dto;

import java.util.List;

/**
 * Đơn hàng nhìn từ phía kho. Thay cho việc trả thẳng entity Order (kéo theo
 * entity User và toàn bộ quan hệ lazy) ra API nhân viên kho.
 */
public record WarehouseOrderDto(
        Long id,
        Long orderId,
        String orderCode,
        String status,
        String customerName,
        String phone,
        String shippingAddress,
        String paymentMethod,
        Double total,
        String paymentStatus,
        Double codAmount,
        String createdAt,
        int itemCount,
        List<Item> items
) {
    public record Item(
            Long productId,
            String productName,
            String color,
            String size,
            String image,
            int quantity,
            String warehouseLocation,
            /** Tồn khả dụng hiện tại; chỉ có với đơn chờ lấy hàng (đơn đang lấy đã tự giữ phần của nó). */
            Integer availableQuantity
    ) {}
}
