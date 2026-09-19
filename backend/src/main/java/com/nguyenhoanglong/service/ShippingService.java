package com.nguyenhoanglong.service;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ShippingService {
    private final OrderRepository orders;
    private final ShipmentRepository shipments;
    private final ShippingExceptionRepository exceptions;
    private final ProofOfDeliveryRepository proofs;

    public ShippingService(OrderRepository orders, ShipmentRepository shipments, ShippingExceptionRepository exceptions, ProofOfDeliveryRepository proofs) {
        this.orders = orders; this.shipments = shipments; this.exceptions = exceptions; this.proofs = proofs;
    }

    public List<Order> getReadyOrders() { return orders.findByStatusOrderByCreatedAtDesc(OrderStatus.handed_to_carrier); }
    public List<Shipment> getAllShipments() { return shipments.findAll(); }
    public Shipment getShipment(UUID id) { return shipment(id); }

    public Shipment createShipment(UUID orderId, String carrierName, String trackingCode, BigDecimal codAmount) {
        Order order = order(orderId);
        if (order.getStatus() != OrderStatus.handed_to_carrier) throw new IllegalArgumentException("Đơn chưa ở trạng thái handed_to_carrier");
        if (shipments.findByOrderId(orderId).isPresent()) throw new IllegalArgumentException("Đơn đã có shipment");
        Shipment s = new Shipment(); s.setOrder(order);         s.setCarrierName(carrierName); s.setTrackingCode(trackingCode);
        s.setCodAmount(codAmount == null ? BigDecimal.ZERO : codAmount); s.setStatus(ShipmentStatus.pending);
        return shipments.save(s);
    }

    public Shipment updateTrackingCode(UUID id, String trackingCode) { Shipment s = shipment(id); s.setTrackingCode(trackingCode); return shipments.save(s); }

    @Transactional
    public Shipment handover(UUID id) {
        Shipment s = shipment(id); s.setStatus(ShipmentStatus.handed_over); s.setHandoverAt(LocalDateTime.now());
        Order o = s.getOrder(); o.setStatus(OrderStatus.handed_to_carrier); orders.save(o); return shipments.save(s);
    }

    @Transactional
    public Shipment startShipping(UUID id) {
        Shipment s = shipment(id);
        if (s.getStatus() != ShipmentStatus.handed_over) throw new IllegalArgumentException("Kiện hàng chưa được bàn giao cho hãng vận chuyển");
        s.setStatus(ShipmentStatus.in_transit);
        Order o = s.getOrder(); o.setStatus(OrderStatus.shipping); orders.save(o);
        return shipments.save(s);
    }
    public List<ShippingException> getExceptions() { return exceptions.findAllByOrderByCreatedAtDesc(); }

    public ShippingException addException(UUID shipmentId, String type, String description) {
        Shipment s = shipment(shipmentId); s.setStatus(ShipmentStatus.exception); shipments.save(s);
        ShippingException e = new ShippingException(); e.setShipment(s); e.setExceptionType(type); e.setDescription(description); e.setStatus("OPEN");
        return exceptions.save(e);
    }

    public ShippingException resolveException(UUID id, String note) {
        ShippingException e = exceptions.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ngoại lệ"));
        e.setStatus("RESOLVED"); e.setResolutionNote(note); return exceptions.save(e);
    }

    @Transactional
    public ProofOfDelivery delivered(UUID shipmentId, String receiverName, String imageUrl, String note) {
        Shipment s = shipment(shipmentId);         s.setStatus(ShipmentStatus.delivered); s.setDeliveredAt(LocalDateTime.now());
        s.setDeliveryProofUrl(imageUrl); shipments.save(s);
        Order o = s.getOrder(); o.setStatus(OrderStatus.delivered); orders.save(o);
        ProofOfDelivery p = new ProofOfDelivery(); p.setShipment(s); p.setReceiverName(receiverName); p.setImageUrl(imageUrl); p.setNote(note);
        return proofs.save(p);
    }

    public List<Shipment> getPendingCod() {
        return shipments.findAll().stream().filter(s -> s.getStatus() == ShipmentStatus.delivered)
                .filter(s -> s.getCodAmount() != null && s.getCodAmount().compareTo(BigDecimal.ZERO) > 0)
                .filter(s -> !Boolean.TRUE.equals(s.getCodReconciled())).toList();
    }

    public Shipment reconcileCod(UUID id) {
        Shipment s = shipment(id); if (s.getStatus() != ShipmentStatus.delivered) throw new IllegalArgumentException("Chỉ đối soát COD sau khi giao thành công");
        if (s.getCodAmount() == null || s.getCodAmount().compareTo(BigDecimal.ZERO) <= 0) throw new IllegalArgumentException("Kiện hàng không có tiền thu hộ để đối soát");
        s.setCodReconciled(true); return shipments.save(s);
    }

    private Shipment shipment(UUID id) { return shipments.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy shipment " + id)); }
    private Order order(UUID id) { return orders.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng " + id)); }
}
