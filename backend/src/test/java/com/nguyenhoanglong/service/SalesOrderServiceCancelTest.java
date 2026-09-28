package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.Order;
import com.nguyenhoanglong.entity.OrderItem;
import com.nguyenhoanglong.entity.OrderStatus;
import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.entity.ProductVariant;
import com.nguyenhoanglong.entity.StockReservation;
import com.nguyenhoanglong.repository.InventoryRepository;
import com.nguyenhoanglong.repository.OrderNoteRepository;
import com.nguyenhoanglong.repository.OrderRepository;
import com.nguyenhoanglong.repository.OrderStatusHistoryRepository;
import com.nguyenhoanglong.repository.ProductRepository;
import com.nguyenhoanglong.repository.ProductVariantRepository;
import com.nguyenhoanglong.repository.StockReservationRepository;
import com.nguyenhoanglong.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Regression coverage for ORD-INV-001: checkout (OrderService) decrements
 * product_variants.stock/available_quantity, but cancelOrder used to only release
 * inventories.quantity_reserved, never giving the sold stock back to the variant.
 * Every cancellation permanently destroyed sellable inventory.
 */
@ExtendWith(MockitoExtension.class)
class SalesOrderServiceCancelTest {

    @Mock private OrderRepository orders;
    @Mock private OrderNoteRepository notes;
    @Mock private StockReservationRepository reservations;
    @Mock private ProductRepository productRepository;
    @Mock private UserRepository userRepository;
    @Mock private OrderStatusHistoryRepository historyRepository;
    @Mock private InventoryRepository inventoryRepository;
    @Mock private ProductVariantRepository variantRepository;

    private SalesOrderService service;

    @BeforeEach
    void setUp() {
        service = new SalesOrderService(
                orders, notes, reservations, productRepository, userRepository,
                new OrderStateMachine(), historyRepository, inventoryRepository, variantRepository);
    }

    @Test
    void cancelOrder_restoresVariantStockThatCheckoutDeducted() {
        Long variantId = 42L;
        ProductVariant variant = new ProductVariant();
        variant.setId(variantId);
        variant.setStock(3);
        variant.setAvailableQuantity(3);

        Product product = new Product();
        product.setId(1L);

        OrderItem item = new OrderItem();
        item.setVariantId(variantId);
        item.setQuantity(2);
        item.setProduct(product);

        Order order = new Order();
        order.setId(100L);
        order.setStatus(OrderStatus.CONFIRMED);
        order.setItems(List.of(item));

        when(orders.findById(100L)).thenReturn(Optional.of(order));
        when(orders.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(reservations.findByOrderId(100L)).thenReturn(List.<StockReservation>of());
        when(variantRepository.findByIdWithPessimisticLock(variantId)).thenReturn(Optional.of(variant));

        service.cancelOrder(100L, "Khách đổi ý");

        ArgumentCaptor<ProductVariant> captor = ArgumentCaptor.forClass(ProductVariant.class);
        org.mockito.Mockito.verify(variantRepository).save(captor.capture());

        assertThat(captor.getValue().getStock()).isEqualTo(5);
        assertThat(captor.getValue().getAvailableQuantity()).isEqualTo(5);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
    }

    @Test
    void cancelOrder_skipsItemsWithNoVariant() {
        OrderItem item = new OrderItem(); // variantId defaults to 0L, no product variant link
        item.setQuantity(1);

        Order order = new Order();
        order.setId(101L);
        order.setStatus(OrderStatus.PENDING_CONFIRMATION);
        order.setItems(List.of(item));

        when(orders.findById(101L)).thenReturn(Optional.of(order));
        when(orders.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(reservations.findByOrderId(101L)).thenReturn(List.<StockReservation>of());

        service.cancelOrder(101L, "Không còn nhu cầu");

        org.mockito.Mockito.verify(variantRepository, org.mockito.Mockito.never())
                .findByIdWithPessimisticLock(any());
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
    }
}
