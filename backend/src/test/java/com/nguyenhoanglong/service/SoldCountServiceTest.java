package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.Order;
import com.nguyenhoanglong.entity.OrderItem;
import com.nguyenhoanglong.entity.OrderStatus;
import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * sold_count chi thay doi khi don thuc su chuyen trang thai, tung nhat mot lan
 * bang co Order.soldCounted. Xem SoldCountService.
 */
@ExtendWith(MockitoExtension.class)
class SoldCountServiceTest {

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private SoldCountService soldCountService;

    private Order order;
    private Product product;

    @BeforeEach
    void setUp() {
        product = new Product();
        product.setId(1L);

        OrderItem item = new OrderItem();
        item.setProduct(product);
        item.setQuantity(3);

        order = new Order();
        order.setItems(List.of(item));
        order.setSoldCounted(false);
    }

    @Test
    void giaoThanhCong_congDungSoLuong() {
        soldCountService.syncForStatus(order, OrderStatus.DELIVERED);

        verify(productRepository, times(1)).incrementSoldCount(1L, 3);
        verify(productRepository, never()).decrementSoldCount(anyLong(), anyInt());
        assertThat(order.isSoldCounted()).isTrue();
    }

    @Test
    void capNhatTrangThaiLapLai_khongCongTrung() {
        // Da tung dong bo cho trang thai DELIVERED (co da bat).
        order.setSoldCounted(true);

        soldCountService.syncForStatus(order, OrderStatus.DELIVERED);

        verify(productRepository, never()).incrementSoldCount(anyLong(), anyInt());
    }

    @Test
    void huyTruocKhiGiao_khongCong() {
        // Don huy (CANCELLED) khong nam trong SOLD_STATUSES lan RETURNED_STATUSES.
        soldCountService.syncForStatus(order, OrderStatus.CANCELLED);

        verify(productRepository, never()).incrementSoldCount(anyLong(), anyInt());
        verify(productRepository, never()).decrementSoldCount(anyLong(), anyInt());
        assertThat(order.isSoldCounted()).isFalse();
    }

    @Test
    void traHangSauKhiGiao_truDungSoLuong() {
        order.setSoldCounted(true); // da giao thanh cong truoc do

        soldCountService.syncForStatus(order, OrderStatus.RETURNED);

        verify(productRepository, times(1)).decrementSoldCount(1L, 3);
        assertThat(order.isSoldCounted()).isFalse();
    }

    @Test
    void tuChoiYeuCauTraHang_quayVeDeliveredKhongTruLaiDup() {
        // RETURN_REQUESTED -> DELIVERED la mot chuyen hop le (tu choi tra hang).
        // Khong duoc tru o RETURN_REQUESTED, va soldCounted van dang true nen
        // khong cong lai o day.
        order.setSoldCounted(true);

        soldCountService.syncForStatus(order, OrderStatus.RETURN_REQUESTED);
        verify(productRepository, never()).incrementSoldCount(anyLong(), anyInt());
        verify(productRepository, never()).decrementSoldCount(anyLong(), anyInt());
        assertThat(order.isSoldCounted()).isTrue();

        soldCountService.syncForStatus(order, OrderStatus.DELIVERED);
        verify(productRepository, never()).incrementSoldCount(anyLong(), anyInt());
        assertThat(order.isSoldCounted()).isTrue();
    }

    @Test
    void giaoRoiHoanTienThangKhongQuaReturned_truDungMotLan() {
        order.setSoldCounted(true); // da giao thanh cong

        soldCountService.syncForStatus(order, OrderStatus.REFUNDED);

        verify(productRepository, times(1)).decrementSoldCount(1L, 3);
        assertThat(order.isSoldCounted()).isFalse();
    }

    @Test
    void duongDiThuongReturnedRoiRefunded_khongTruHaiLan() {
        order.setSoldCounted(true);

        soldCountService.syncForStatus(order, OrderStatus.RETURNED);
        verify(productRepository, times(1)).decrementSoldCount(1L, 3);
        assertThat(order.isSoldCounted()).isFalse();

        // Toi REFUNDED, soldCounted da la false nen khong tru lan nua.
        soldCountService.syncForStatus(order, OrderStatus.REFUNDED);
        verify(productRepository, times(1)).decrementSoldCount(1L, 3); // van chi 1 lan
    }
}
