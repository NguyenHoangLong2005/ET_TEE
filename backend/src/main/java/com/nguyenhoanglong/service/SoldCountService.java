package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.Order;
import com.nguyenhoanglong.entity.OrderItem;
import com.nguyenhoanglong.entity.OrderStatus;
import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

/**
 * Nguon duy nhat quyet dinh khi nao Product.soldCount thay doi.
 *
 * Truoc day so luong da ban duoc cong ngay luc checkout (OrderService) roi tru ra
 * khi huy don. Nghia la don vua dat da tinh la da ban, ke ca khi no khong bao gio
 * duoc giao. Gio so lieu chi thay doi khi don thuc su giao thanh cong.
 *
 * Chong cong/tru trung bang co {@link Order#isSoldCounted()} thay vi dua vao trang
 * thai cu: goi lap lai, webhook ban hai lan, hay duong di DELIVERED -> REFUNDED
 * (khong qua RETURNED) deu chi tac dong dung mot lan.
 */
@Service
public class SoldCountService {

    /**
     * Cac trang thai nghia la "da ban xong".
     * Theo OrderStateMachine, DELIVERED la trang thai thanh cong duy nhat: khong co
     * COMPLETED, khong co luong ban tai quay di tat. Tap hop de o day de khi them
     * trang thai thanh cong moi thi chi phai sua mot cho.
     */
    public static final Set<OrderStatus> SOLD_STATUSES = Set.of(OrderStatus.DELIVERED);

    /**
     * Cac trang thai nghia la hang da quay ve, phai tra lai so da ban.
     *
     * RETURN_REQUESTED co y KHONG nam trong day: OrderStateMachine cho phep
     * RETURN_REQUESTED -> DELIVERED khi yeu cau tra hang bi tu choi, tru o buoc do
     * se lam don bi tu choi tra mat luot ban.
     *
     * REFUNDED nam trong day de phong truong hop don di thang DELIVERED -> REFUNDED.
     * Duong di thong thuong RETURNED -> REFUNDED khong bi tru hai lan vi luc toi
     * REFUNDED thi co soldCounted da la false.
     */
    public static final Set<OrderStatus> RETURNED_STATUSES =
            Set.of(OrderStatus.RETURNED, OrderStatus.REFUNDED);

    private final ProductRepository productRepository;

    public SoldCountService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public static boolean isSoldStatus(OrderStatus status) {
        return status != null && SOLD_STATUSES.contains(status);
    }

    /**
     * Dong bo soldCount theo trang thai moi cua don.
     *
     * Goi TRONG cung transaction voi thao tac doi trang thai, sau khi da gan trang
     * thai moi len entity. Ham tu quyet dinh cong, tru hay khong lam gi.
     */
    @Transactional
    public void syncForStatus(Order order, OrderStatus newStatus) {
        if (order == null || newStatus == null) {
            return;
        }

        if (isSoldStatus(newStatus)) {
            if (!order.isSoldCounted()) {
                applyToItems(order, true);
                order.setSoldCounted(true);
            }
            return;
        }

        if (RETURNED_STATUSES.contains(newStatus) && order.isSoldCounted()) {
            applyToItems(order, false);
            order.setSoldCounted(false);
        }
    }

    private void applyToItems(Order order, boolean increment) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            return;
        }
        for (OrderItem item : order.getItems()) {
            Product product = item.getProduct();
            if (product == null || product.getId() == null) {
                continue;
            }
            int quantity = item.getQuantity() != null ? item.getQuantity() : 0;
            if (quantity <= 0) {
                continue;
            }
            if (increment) {
                productRepository.incrementSoldCount(product.getId(), quantity);
            } else {
                productRepository.decrementSoldCount(product.getId(), quantity);
            }
        }
    }
}
