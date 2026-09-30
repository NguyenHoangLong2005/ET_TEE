package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
<<<<<<< HEAD

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
=======
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
>>>>>>> main

@Service
public class ShippingService {
    private final OrderRepository orders;
    private final ShipmentRepository shipments;
    private final ShippingExceptionRepository exceptions;
    private final ProofOfDeliveryRepository proofs;
    private final CodReconciliationRepository codReconciliationRepository;
    private final CodReconciliationItemRepository codReconciliationItemRepository;
    private final SoldCountService soldCountService;
    private final OrderStateMachine stateMachine;
    private final OrderStatusHistoryRepository historyRepository;

    public ShippingService(OrderRepository orders,
                           ShipmentRepository shipments,
                           ShippingExceptionRepository exceptions,
                           ProofOfDeliveryRepository proofs,
                           CodReconciliationRepository codReconciliationRepository,
                           CodReconciliationItemRepository codReconciliationItemRepository,
                           SoldCountService soldCountService,
                           OrderStateMachine stateMachine,
                           OrderStatusHistoryRepository historyRepository) {
        this.orders = orders;
        this.shipments = shipments;
        this.exceptions = exceptions;
        this.proofs = proofs;
        this.codReconciliationRepository = codReconciliationRepository;
        this.codReconciliationItemRepository = codReconciliationItemRepository;
        this.soldCountService = soldCountService;
        this.stateMachine = stateMachine;
        this.historyRepository = historyRepository;
    }

<<<<<<< HEAD
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
=======
    /**
     * Validates the transition and writes the same OrderStatusHistory trail sales
     * and warehouse already write. handover/startShipping/delivered previously set
     * order status directly with no validation and no audit row at all, so a
     * DELIVERED shipment could be pushed back to HANDED_TO_CARRIER with no trace.
     */
    private void transitionOrder(Order order, OrderStatus target, User actor, String reason) {
        OrderStatus from = order.getStatus();
        stateMachine.validateTransition(from, target);
        order.setStatus(target);
        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrderId(order.getId());
        history.setFromStatus(from != null ? from.name() : null);
        history.setStatus(target.name());
        history.setChangedBy(actor != null ? actor.getId() : null);
        history.setReason(reason);
        historyRepository.save(history);
    }

    private void enforceShippingShopOwnership(User actor, Order order) {
        if (actor == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        }
        if (actor.getRole() != Role.ADMIN) {
            Long staffShopId = actor.getShopId();
            if (staffShopId == null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản nhân viên chưa được gán chi nhánh");
            }
            if (order == null || order.getShopId() == null || !staffShopId.equals(order.getShopId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền thao tác trên kiện hàng/đơn hàng thuộc chi nhánh khác");
            }
        }
>>>>>>> main
    }

    public List<Order> getReadyOrders(User actor) {
        List<Order> list = orders.findByStatusOrderByCreatedAtDesc(OrderStatus.HANDED_TO_CARRIER);
        if (actor != null && actor.getRole() != Role.ADMIN) {
            Long staffShopId = actor.getShopId();
            if (staffShopId == null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản nhân viên chưa được gán chi nhánh");
            }
            return list.stream().filter(o -> staffShopId.equals(o.getShopId())).toList();
        }
        return list;
    }

    public List<Shipment> getAllShipments(User actor) {
        List<Shipment> list = shipments.findAll();
        if (actor != null && actor.getRole() != Role.ADMIN) {
            Long staffShopId = actor.getShopId();
            if (staffShopId == null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản nhân viên chưa được gán chi nhánh");
            }
            return list.stream()
                    .filter(s -> s.getOrder() != null && staffShopId.equals(s.getOrder().getShopId()))
                    .toList();
        }
        return list;
    }

    public Shipment getShipment(User actor, Long id) {
        Shipment s = shipment(id);
<<<<<<< HEAD
        if (s.getStatus() != ShipmentStatus.HANDED_OVER) throw new IllegalArgumentException("Kien hang chua duoc ban giao cho nha van chuyen");
        s.setStatus(ShipmentStatus.IN_TRANSIT);
        Order o = order(s.getOrderId()); o.setStatus(OrderStatus.SHIPPING); orders.save(o);
=======
        enforceShippingShopOwnership(actor, s.getOrder());
        return s;
    }

    public Shipment createShipment(User actor, Long orderId, String carrierName, String trackingCode, BigDecimal codAmount) {
        Order order = order(orderId);
        enforceShippingShopOwnership(actor, order);

        if (order.getStatus() != OrderStatus.HANDED_TO_CARRIER) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn chưa ở trạng thái HANDED_TO_CARRIER");
        }
        if (shipments.findByOrderId(orderId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn đã có shipment");
        }
        Shipment s = new Shipment();
        s.setOrder(order);
        s.setCarrierName(carrierName);
        s.setTrackingCode(trackingCode);
        s.setCodAmount(resolveCodAmount(order, codAmount));
        s.setStatus(ShipmentStatus.PENDING);
>>>>>>> main
        return shipments.save(s);
    }

<<<<<<< HEAD
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
=======
    public Shipment updateTrackingCode(User actor, Long id, String trackingCode) {
        Shipment s = shipment(id);
        enforceShippingShopOwnership(actor, s.getOrder());
        s.setTrackingCode(trackingCode);
        return shipments.save(s);
    }

    @Transactional
    public Shipment handover(User actor, Long id) {
        Shipment s = shipment(id);
        enforceShippingShopOwnership(actor, s.getOrder());
        // createShipment already requires the order to be HANDED_TO_CARRIER (it is
        // how warehouse marks "ready to ship"), so this event is shipment-level
        // bookkeeping only: it does not itself move the order to a new status.
        s.setStatus(ShipmentStatus.HANDED_OVER);
        s.setHandoverAt(LocalDateTime.now());
        return shipments.save(s);
    }

    @Transactional
    public Shipment startShipping(User actor, Long id) {
        Shipment s = shipment(id);
        enforceShippingShopOwnership(actor, s.getOrder());
        if (s.getStatus() != ShipmentStatus.HANDED_OVER) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kiện hàng chưa được bàn giao cho hãng vận chuyển");
        }
        s.setStatus(ShipmentStatus.IN_TRANSIT);
        Order o = s.getOrder();
        transitionOrder(o, OrderStatus.SHIPPING, actor, "Bắt đầu vận chuyển");
        orders.save(o);
        return shipments.save(s);
    }

    public List<ShippingException> getExceptions(User actor) {
        List<ShippingException> list = exceptions.findAllByOrderByCreatedAtDesc();
        if (actor != null && actor.getRole() != Role.ADMIN) {
            Long staffShopId = actor.getShopId();
            if (staffShopId == null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản nhân viên chưa được gán chi nhánh");
            }
            return list.stream()
                    .filter(e -> e.getShipment() != null && e.getShipment().getOrder() != null && staffShopId.equals(e.getShipment().getOrder().getShopId()))
                    .toList();
        }
        return list;
    }

    public ShippingException addException(User actor, Long shipmentId, String type, String description) {
        Shipment s = shipment(shipmentId);
        enforceShippingShopOwnership(actor, s.getOrder());
        s.setStatus(ShipmentStatus.EXCEPTION);
        shipments.save(s);

        ShippingException e = new ShippingException();
        e.setShipment(s);
        e.setExceptionType(type);
        e.setDescription(description);
        e.setStatus("OPEN");
        return exceptions.save(e);
    }

    public ShippingException resolveException(User actor, Long id, String note) {
        ShippingException e = exceptions.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ngoại lệ " + id));
        if (e.getShipment() != null) {
            enforceShippingShopOwnership(actor, e.getShipment().getOrder());
        }
        e.setStatus("RESOLVED");
        e.setResolutionNote(note);

        // addException force-sets the shipment to EXCEPTION and nothing ever moved
        // it back, permanently stranding a shipment that had even one resolved
        // exception. Resolution returns it to HANDED_OVER, the state it must have
        // been in to receive an exception in the normal flow, so it can continue.
        Shipment shipment = e.getShipment();
        if (shipment != null && shipment.getStatus() == ShipmentStatus.EXCEPTION) {
            shipment.setStatus(ShipmentStatus.HANDED_OVER);
            shipments.save(shipment);
        }
        return exceptions.save(e);
    }

    @Transactional
    public ProofOfDelivery delivered(User actor, Long shipmentId, String receiverName, String imageUrl, String note) {
        Shipment s = shipment(shipmentId);
        enforceShippingShopOwnership(actor, s.getOrder());
        s.setStatus(ShipmentStatus.DELIVERED);
        s.setDeliveredAt(LocalDateTime.now());
        s.setDeliveryProofUrl(imageUrl);
        shipments.save(s);

        Order o = s.getOrder();
        transitionOrder(o, OrderStatus.DELIVERED, actor, "Giao hàng thành công");
        soldCountService.syncForStatus(o, OrderStatus.DELIVERED);
        // paymentStatus was only ever set at checkout (COD_PENDING / WAITING_TRANSFER)
        // and never advanced again, so every delivered order still read as unpaid.
        // COD is settled at reconciliation (below); a delivered COD order is "money
        // collected, not yet reconciled with the courier" until then.
        if ("COD".equalsIgnoreCase(o.getPaymentMethod())) {
            o.setPaymentStatus("COD_COLLECTED");
        }
        orders.save(o);

        ProofOfDelivery p = new ProofOfDelivery();
        p.setShipment(s);
        p.setReceiverName(receiverName);
        p.setImageUrl(imageUrl);
        p.setNote(note);
        return proofs.save(p);
    }

    public List<Shipment> getPendingCod(User actor) {
        List<Shipment> list = shipments.findAll().stream()
                .filter(s -> s.getStatus() == ShipmentStatus.DELIVERED)
>>>>>>> main
                .filter(s -> s.getCodAmount() != null && s.getCodAmount().compareTo(BigDecimal.ZERO) > 0)
                .filter(s -> !Boolean.TRUE.equals(s.getCodReconciled()))
                .filter(s -> !codReconciliationItemRepository.existsByShipmentId(s.getId()))
                .toList();

        if (actor != null && actor.getRole() != Role.ADMIN) {
            Long staffShopId = actor.getShopId();
            if (staffShopId == null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản nhân viên chưa được gán chi nhánh");
            }
            return list.stream()
                    .filter(s -> s.getOrder() != null && staffShopId.equals(s.getOrder().getShopId()))
                    .toList();
        }
        return list;
    }

<<<<<<< HEAD
    public Shipment reconcileCod(Long id) {
        Shipment s = shipment(id); if (s.getStatus() != ShipmentStatus.DELIVERED) throw new IllegalArgumentException("Chi doi tras COD sau khi giao thanh cong");
        if (s.getCodAmount() == null || s.getCodAmount().compareTo(BigDecimal.ZERO) <= 0) throw new IllegalArgumentException("Kien hang khong co tien thu ho de doi tras");
        s.setCodReconciled(true); return shipments.save(s);
    }

    private Shipment shipment(Long id) { return shipments.findById(id).orElseThrow(() -> new IllegalArgumentException("Khong tim thay shipment " + id)); }
    private Order order(Long id) { return orders.findById(id).orElseThrow(() -> new IllegalArgumentException("Khong tim thay don hang " + id)); }
=======
    @Transactional
    public CodReconciliationDto createCodReconciliation(User actor, CreateCodReconciliationDto dto) {
        if (actor == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        }
        if (dto == null || dto.getShipmentIds() == null || dto.getShipmentIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Danh sách vận đơn đối soát không được để trống");
        }

        List<Long> uniqueIds = dto.getShipmentIds().stream().distinct().toList();
        Long targetShopId = actor.getRole() == Role.ADMIN ? null : actor.getShopId();

        if (actor.getRole() != Role.ADMIN && targetShopId == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản nhân viên chưa được gán chi nhánh");
        }

        List<Shipment> targetShipments = new ArrayList<>();
        BigDecimal totalCod = BigDecimal.ZERO;

        for (Long sId : uniqueIds) {
            Shipment s = shipments.findById(sId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vận đơn ID: " + sId));

            enforceShippingShopOwnership(actor, s.getOrder());

            if (s.getStatus() != ShipmentStatus.DELIVERED) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vận đơn " + (s.getTrackingCode() != null ? s.getTrackingCode() : s.getId()) + " chưa ở trạng thái GIAO THÀNH CÔNG");
            }

            if (s.getCodAmount() == null || s.getCodAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vận đơn " + (s.getTrackingCode() != null ? s.getTrackingCode() : s.getId()) + " không có tiền thu hộ COD");
            }

            if (Boolean.TRUE.equals(s.getCodReconciled()) || codReconciliationItemRepository.existsByShipmentId(s.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vận đơn " + (s.getTrackingCode() != null ? s.getTrackingCode() : s.getId()) + " đã được đối soát trong phiếu khác");
            }

            if (targetShopId == null && s.getOrder() != null) {
                targetShopId = s.getOrder().getShopId();
            }

            targetShipments.add(s);
            totalCod = totalCod.add(s.getCodAmount());
        }

        String recCode = "COD-REC-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-" + String.format("%04d", new Random().nextInt(10000));

        CodReconciliation rec = new CodReconciliation();
        rec.setReconciliationCode(recCode);
        rec.setShopId(targetShopId);
        rec.setTotalCodAmount(totalCod);
        rec.setItemCount(targetShipments.size());
        rec.setReconciledBy(actor.getEmail() != null ? actor.getEmail() : actor.getId());
        rec.setReconciledByName(actor.getFullName());
        rec.setReconciledAt(LocalDateTime.now());
        rec.setNote(dto.getNote());
        rec.setStatus("COMPLETED");

        rec = codReconciliationRepository.save(rec);

        List<CodReconciliationItemDto> itemDtos = new ArrayList<>();
        for (Shipment s : targetShipments) {
            try {
                CodReconciliationItem item = new CodReconciliationItem();
                item.setReconciliation(rec);
                item.setShipment(s);
                item.setCodAmount(s.getCodAmount());
                item = codReconciliationItemRepository.save(item);
                rec.getItems().add(item);

                s.setCodReconciled(true);
                shipments.save(s);
                if (s.getOrder() != null && "COD".equalsIgnoreCase(s.getOrder().getPaymentMethod())) {
                    s.getOrder().setPaymentStatus("PAID");
                    orders.save(s.getOrder());
                }

                itemDtos.add(new CodReconciliationItemDto(
                        item.getId(),
                        s.getId(),
                        s.getTrackingCode(),
                        s.getOrder() != null ? s.getOrder().getOrderCode() : null,
                        s.getOrder() != null ? s.getOrder().getCustomerName() : null,
                        s.getCodAmount(),
                        item.getCreatedAt()
                ));
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vận đơn " + (s.getTrackingCode() != null ? s.getTrackingCode() : s.getId()) + " đã được đối soát trong một giao dịch khác");
            }
        }

        return toCodReconciliationDto(rec, itemDtos);
    }

    @Transactional(readOnly = true)
    public PaginatedResponseDto<CodReconciliationDto> getCodReconciliations(User actor, int page, int size) {
        if (actor == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        }
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<CodReconciliation> pageResult;

        if (actor.getRole() == Role.ADMIN) {
            pageResult = codReconciliationRepository.findAllByOrderByCreatedAtDesc(pageable);
        } else {
            Long staffShopId = actor.getShopId();
            if (staffShopId == null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản nhân viên chưa được gán chi nhánh");
            }
            pageResult = codReconciliationRepository.findByShopIdOrderByCreatedAtDesc(staffShopId, pageable);
        }

        List<CodReconciliationDto> dtoList = pageResult.getContent().stream()
                .map(this::toCodReconciliationDto)
                .collect(Collectors.toList());

        return new PaginatedResponseDto<>(
                dtoList,
                pageResult.getTotalElements(),
                pageResult.getNumber(),
                pageResult.getSize(),
                pageResult.getTotalPages(),
                null
        );
    }

    @Transactional(readOnly = true)
    public CodReconciliationDto getCodReconciliationDetail(User actor, Long id) {
        if (actor == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        }
        CodReconciliation rec = codReconciliationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phiếu đối soát ID: " + id));

        if (actor.getRole() != Role.ADMIN) {
            Long staffShopId = actor.getShopId();
            if (staffShopId == null || rec.getShopId() == null || !staffShopId.equals(rec.getShopId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền truy cập phiếu đối soát thuộc chi nhánh khác");
            }
        }

        return toCodReconciliationDto(rec);
    }

    @Transactional
    public Shipment reconcileCod(User actor, Long id) {
        Shipment s = shipment(id);
        enforceShippingShopOwnership(actor, s.getOrder());

        CreateCodReconciliationDto createDto = new CreateCodReconciliationDto(List.of(id), "Đối soát nhanh đơn lẻ");
        createCodReconciliation(actor, createDto);

        return shipments.findById(id).orElse(s);
    }

    /**
     * COD is money the courier must collect, so it is derived from the order, not
     * from the request body. Previously the caller supplied it unchecked: 0 on a COD
     * order lost the payment, and a non-zero value on a prepaid order double-charged
     * the customer. A caller may still pass the exact expected amount (idempotent
     * clients do); anything else is rejected.
     */
    private BigDecimal resolveCodAmount(Order order, BigDecimal requested) {
        BigDecimal expected = expectedCod(order);
        if (requested != null && requested.compareTo(expected) != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Số tiền COD không khớp với đơn hàng. Bắt buộc: " + expected.toPlainString());
        }
        return expected;
    }

    /** Only unpaid cash-on-delivery orders carry a COD amount. */
    private BigDecimal expectedCod(Order order) {
        if (!"COD".equalsIgnoreCase(order.getPaymentMethod())) {
            return BigDecimal.ZERO;
        }
        if ("PAID".equalsIgnoreCase(order.getPaymentStatus())) {
            return BigDecimal.ZERO;
        }
        Double total = order.getTotalAmount();
        return total == null ? BigDecimal.ZERO : BigDecimal.valueOf(total);
    }

    private Shipment shipment(Long id) {
        return shipments.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy shipment " + id));
    }

    private Order order(Long id) {
        return orders.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng " + id));
    }

    private CodReconciliationDto toCodReconciliationDto(CodReconciliation rec) {
        List<CodReconciliationItemDto> itemDtos = rec.getItems() != null
                ? rec.getItems().stream().map(i -> new CodReconciliationItemDto(
                i.getId(),
                i.getShipment() != null ? i.getShipment().getId() : null,
                i.getShipment() != null ? i.getShipment().getTrackingCode() : null,
                i.getShipment() != null && i.getShipment().getOrder() != null ? i.getShipment().getOrder().getOrderCode() : null,
                i.getShipment() != null && i.getShipment().getOrder() != null ? i.getShipment().getOrder().getCustomerName() : null,
                i.getCodAmount(),
                i.getCreatedAt()
        )).collect(Collectors.toList())
                : Collections.emptyList();

        return toCodReconciliationDto(rec, itemDtos);
    }

    private CodReconciliationDto toCodReconciliationDto(CodReconciliation rec, List<CodReconciliationItemDto> itemDtos) {
        return new CodReconciliationDto(
                rec.getId(),
                rec.getReconciliationCode(),
                rec.getShopId(),
                rec.getTotalCodAmount(),
                rec.getItemCount(),
                rec.getReconciledBy(),
                rec.getReconciledByName(),
                rec.getReconciledAt(),
                rec.getNote(),
                rec.getStatus(),
                rec.getCreatedAt(),
                itemDtos
        );
    }
>>>>>>> main
}
