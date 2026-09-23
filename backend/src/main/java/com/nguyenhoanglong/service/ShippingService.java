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

    public List<Order> getReadyOrders() { return orders.findByStatusOrderByCreatedAtDesc(OrderStatus.HANDED_TO_CARRIER); }
    public List<Shipment> getAllShipments() { return shipments.findAll(); }
    public Shipment getShipment(Long id) { return shipment(id); }

    public Shipment createShipment(Long orderId, String carrierName, String trackingCode, BigDecimal codAmount) {
        Order order = order(orderId);
        if (order.getStatus() != OrderStatus.HANDED_TO_CARRIER) throw new IllegalArgumentException("Don chua o trang thai handed_to_carrier");
        if (shipments.findByOrderId(orderId).isPresent()) throw new IllegalArgumentException("Don da co shipment");
        Shipment s = new Shipment(); s.setOrderId(order.getOrderId()); s.setId(UUID.randomUUID()); s.setCarrier(carrierName); s.setCarrierName(carrierName); s.setTrackingCode(trackingCode);
        s.setCodAmount(codAmount == null ? BigDecimal.ZERO : codAmount); s.setStatus(ShipmentStatus.PENDING);
        return shipments.save(s);
    }

    public Shipment updateTrackingCode(Long id, String trackingCode) { Shipment s = shipment(id); s.setTrackingCode(trackingCode); return shipments.save(s); }

    @Transactional
    public Shipment handover(Long id) {
        Shipment s = shipment(id); s.setStatus(ShipmentStatus.HANDED_OVER); s.setHandoverAt(LocalDateTime.now());
        Order o = order(s.getOrderId()); o.setStatus(OrderStatus.HANDED_TO_CARRIER); orders.save(o); return shipments.save(s);
    }

    @Transactional
    public Shipment startShipping(Long id) {
        Shipment s = shipment(id);
        if (s.getStatus() != ShipmentStatus.HANDED_OVER) throw new IllegalArgumentException("Kien hang chua duoc ban giao cho nha van chuyen");
        s.setStatus(ShipmentStatus.IN_TRANSIT);
        Order o = order(s.getOrderId()); o.setStatus(OrderStatus.SHIPPING); orders.save(o);
        return shipments.save(s);
    }
    public List<ShippingException> getExceptions() { return exceptions.findAllByOrderByCreatedAtDesc(); }

    public ShippingException addException(Long shipmentId, String type, String description) {
        Shipment s = shipment(shipmentId); s.setStatus(ShipmentStatus.EXCEPTION); shipments.save(s);
        ShippingException e = new ShippingException(); e.setShipmentId(s.getShipmentId()); e.setExceptionType(type); e.setDescription(description); e.setStatus("OPEN");
        return exceptions.save(e);
    }

    public ShippingException resolveException(Long id, String note) {
        ShippingException e = exceptions.findById(id).orElseThrow(() -> new IllegalArgumentException("Khong tim thay ngoai le"));
        e.setStatus("RESOLVED"); e.setResolutionNote(note); return exceptions.save(e);
    }

    @Transactional
    public ProofOfDelivery delivered(Long shipmentId, String receiverName, String imageUrl, String note) {
        Shipment s = shipment(shipmentId); s.setStatus(ShipmentStatus.DELIVERED); s.setDeliveredAt(LocalDateTime.now());
        s.setDeliveryProofUrl(imageUrl); shipments.save(s);
        Order o = order(s.getOrderId()); o.setStatus(OrderStatus.DELIVERED); orders.save(o);
        ProofOfDelivery p = new ProofOfDelivery(); p.setShipmentId(s.getShipmentId()); p.setReceiverName(receiverName); p.setImageUrl(imageUrl); p.setNote(note);
        return proofs.save(p);
    }

    public List<Shipment> getPendingCod() {
        return shipments.findAll().stream().filter(s -> s.getStatus() == ShipmentStatus.DELIVERED)
                .filter(s -> s.getCodAmount() != null && s.getCodAmount().compareTo(BigDecimal.ZERO) > 0)
                .filter(s -> !Boolean.TRUE.equals(s.getCodReconciled())).toList();
    }

    public Shipment reconcileCod(Long id) {
        Shipment s = shipment(id); if (s.getStatus() != ShipmentStatus.DELIVERED) throw new IllegalArgumentException("Chi doi tras COD sau khi giao thanh cong");
        if (s.getCodAmount() == null || s.getCodAmount().compareTo(BigDecimal.ZERO) <= 0) throw new IllegalArgumentException("Kien hang khong co tien thu ho de doi tras");
        s.setCodReconciled(true); return shipments.save(s);
    }

    private Shipment shipment(Long id) { return shipments.findById(id).orElseThrow(() -> new IllegalArgumentException("Khong tim thay shipment " + id)); }
    private Order order(Long id) { return orders.findById(id).orElseThrow(() -> new IllegalArgumentException("Khong tim thay don hang " + id)); }
}
