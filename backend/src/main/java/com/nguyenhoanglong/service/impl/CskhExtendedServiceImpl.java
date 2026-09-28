package com.nguyenhoanglong.service.impl;

import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import com.nguyenhoanglong.service.CskhExtendedService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class CskhExtendedServiceImpl implements CskhExtendedService {

    private final OrderRepository orderRepository;
    private final SupportTicketRepository ticketRepository;
    private final VoucherRepository voucherRepository;
    private final TicketMessageRepository messageRepository;
    private final CskhVoucherQuotaRepository quotaRepository;
    private final CskhVoucherGrantRepository grantRepository;
    private final OrderLookupAuditLogRepository auditLogRepository;

    // Rate Limiter: Map of actorId -> Deque of timestamps (1-minute sliding window, max 10 calls)
    private final ConcurrentHashMap<String, Deque<Long>> rateLimitMap = new ConcurrentHashMap<>();

    private static final Set<BigDecimal> ALLOWED_DENOMINATIONS = Set.of(
            new BigDecimal("20000"),
            new BigDecimal("50000"),
            new BigDecimal("100000"),
            new BigDecimal("200000"),
            new BigDecimal("500000")
    );

    public CskhExtendedServiceImpl(
            OrderRepository orderRepository,
            SupportTicketRepository ticketRepository,
            VoucherRepository voucherRepository,
            TicketMessageRepository messageRepository,
            CskhVoucherQuotaRepository quotaRepository,
            CskhVoucherGrantRepository grantRepository,
            OrderLookupAuditLogRepository auditLogRepository) {
        this.orderRepository = orderRepository;
        this.ticketRepository = ticketRepository;
        this.voucherRepository = voucherRepository;
        this.messageRepository = messageRepository;
        this.quotaRepository = quotaRepository;
        this.grantRepository = grantRepository;
        this.auditLogRepository = auditLogRepository;
    }

    private void checkRateLimit(String actorId) {
        long now = System.currentTimeMillis();
        Deque<Long> timestamps = rateLimitMap.computeIfAbsent(actorId, k -> new LinkedList<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && now - timestamps.peekFirst() > 60000) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= 10) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Bạn đã vượt quá giới hạn 10 lượt tra cứu / phút. Vui lòng thử lại sau.");
            }
            timestamps.addLast(now);
        }
    }

    @Override
    @Transactional
    public RestrictedOrderLookupDto lookupOrder(User actor, OrderLookupRequestDto dto) {
        validateStaffAccess(actor);
        checkRateLimit(actor.getId());

        String searchType = dto.getSearchType() != null ? dto.getSearchType().toUpperCase() : "";
        String query = dto.getQuery() != null ? dto.getQuery().trim() : "";

        if (!"PHONE".equals(searchType) && !"ORDER_CODE".equals(searchType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Loại tìm kiếm phải là 'PHONE' hoặc 'ORDER_CODE'");
        }

        Order order = null;
        if ("ORDER_CODE".equals(searchType)) {
            order = orderRepository.findByOrderCode(query).orElse(null);
        } else {
            List<Order> list = orderRepository.findByCustomerPhoneOrderByCreatedAtDesc(query);
            if (!list.isEmpty()) {
                order = list.get(0);
            }
        }

        if (order == null) {
            recordAudit(actor, searchType, query, null, null, "NOT_FOUND");
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng phù hợp với từ khóa: " + query);
        }

        // Branch Scoping Check for CSKH_STAFF
        if (actor.getRole() == Role.CSKH_STAFF) {
            Long staffShopId = actor.getShopId();
            if (staffShopId == null || order.getShopId() == null || !order.getShopId().equals(staffShopId)) {
                recordAudit(actor, searchType, query, order.getId(), order.getOrderCode(), "FORBIDDEN");
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền tra cứu đơn hàng thuộc chi nhánh khác hoặc đơn hàng do Hội sở quản lý");
            }
        }

        recordAudit(actor, searchType, query, order.getId(), order.getOrderCode(), "SUCCESS");

        return toRestrictedDto(order);
    }

    @Override
    @Transactional
    public CskhVoucherGrantDto issueCompensationVoucher(User actor, IssueCompensationVoucherDto dto) {
        validateStaffAccess(actor);

        SupportTicket ticket = ticketRepository.findById(dto.getTicketId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ticket hỗ trợ ID: " + dto.getTicketId()));

        enforceStaffTicketOwnership(actor, ticket);

        if (ticket.getCustomerId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ticket chưa được gán cho khách hàng cụ thể để phát voucher");
        }

        // Rule 1 Voucher per Ticket: Reject if already granted
        if (grantRepository.existsByTicketId(ticket.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ticket này đã được phát voucher tri ân/đền bù. Mỗi ticket chỉ được phép phát tối đa 1 voucher.");
        }

        // Denomination check
        BigDecimal amount = dto.getAmount();
        if (amount == null || ALLOWED_DENOMINATIONS.stream().noneMatch(d -> d.compareTo(amount) == 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mệnh giá voucher tri ân không hợp lệ. Chỉ chấp nhận các mức 20.000đ, 50.000đ, 100.000đ, 200.000đ, 500.000đ");
        }

        // Quota check
        String currentPeriod = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        CskhVoucherQuota quota = quotaRepository.findByStaffIdAndPeriod(actor.getId(), currentPeriod)
                .orElseGet(() -> {
                    CskhVoucherQuota newQ = new CskhVoucherQuota(actor.getId(), actor.getShopId(), currentPeriod, new BigDecimal("2000000.00"), BigDecimal.ZERO);
                    return quotaRepository.save(newQ);
                });

        BigDecimal newUsedAmount = quota.getUsedAmount().add(amount);
        if (newUsedAmount.compareTo(quota.getQuotaAmount()) > 0) {
            BigDecimal remaining = quota.getQuotaAmount().subtract(quota.getUsedAmount()).max(BigDecimal.ZERO);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đã vượt hạn mức phát voucher tri ân trong kỳ. Hạn mức còn lại trong tháng " + currentPeriod + ": " + remaining.longValue() + " VNĐ");
        }

        // Generate Voucher Code
        String ticketSuffix = ticket.getTicketCode() != null ? ticket.getTicketCode().replaceAll("[^a-zA-Z0-9]", "") : "TK";
        if (ticketSuffix.length() > 6) ticketSuffix = ticketSuffix.substring(ticketSuffix.length() - 6);
        String randomStr = String.format("%04X", new Random().nextInt(0xFFFF));
        String voucherCode = ("CSKH-" + ticketSuffix + "-" + randomStr).toUpperCase();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiryDate = now.plusDays(30);

        Voucher voucher = new Voucher();
        voucher.setCode(voucherCode);
        voucher.setName("Voucher Tri Ân CSKH - Ticket #" + (ticket.getTicketCode() != null ? ticket.getTicketCode() : ticket.getId()));
        voucher.setDescription(dto.getReason() != null ? dto.getReason() : "Voucher đền bù tri ân khách hàng qua kênh hỗ trợ CSKH");
        voucher.setType("FIXED_AMOUNT");
        voucher.setDiscountValue(amount);
        voucher.setMinOrderAmount(BigDecimal.ZERO);
        voucher.setMaxUses(1);
        voucher.setUsedCount(0);
        voucher.setPerUserLimit(1);
        voucher.setIsActive(true);
        voucher.setStatus("ACTIVE");
        voucher.setTargetGroup("CSKH_COMPENSATION");
        voucher.setGrantedToCustomerId(ticket.getCustomerId());
        voucher.setStartDate(now);
        voucher.setEndDate(expiryDate);
        voucher.setShopId(ticket.getShopId());
        voucher.setCreatedBy(actor.getId());
        voucher.setUpdatedBy(actor.getId());

        voucher = voucherRepository.save(voucher);

        // Update Quota Used Amount
        quota.setUsedAmount(newUsedAmount);
        quotaRepository.save(quota);

        // Save Grant Record
        CskhVoucherGrant grant = new CskhVoucherGrant(
                ticket.getId(),
                voucher.getId(),
                voucherCode,
                ticket.getCustomerId(),
                actor.getId(),
                ticket.getShopId(),
                amount,
                dto.getReason(),
                currentPeriod
        );
        grant = grantRepository.save(grant);

        // Create System Message in Ticket Chat
        TicketMessage sysMsg = TicketMessage.builder()
                .ticketId(ticket.getId())
                .senderType("SYSTEM")
                .senderId(actor.getId())
                .senderName(actor.getFullName())
                .message("Đã phát voucher tri ân/đền bù trị giá " + String.format("%,d", amount.longValue()) + "đ (Mã: " + voucherCode + ") cho khách hàng.")
                .build();
        messageRepository.save(sysMsg);

        BigDecimal remainingQuota = quota.getQuotaAmount().subtract(quota.getUsedAmount()).max(BigDecimal.ZERO);

        return new CskhVoucherGrantDto(
                grant.getId(),
                voucherCode,
                amount,
                ticket.getId(),
                ticket.getCustomerId(),
                remainingQuota,
                expiryDate
        );
    }

    @Override
    @Transactional(readOnly = true)
    public CskhQuotaStatusDto getMyQuotaStatus(User actor) {
        validateStaffAccess(actor);
        String currentPeriod = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));

        CskhVoucherQuota quota = quotaRepository.findByStaffIdAndPeriod(actor.getId(), currentPeriod)
                .orElseGet(() -> new CskhVoucherQuota(actor.getId(), actor.getShopId(), currentPeriod, new BigDecimal("2000000.00"), BigDecimal.ZERO));

        BigDecimal remaining = quota.getQuotaAmount().subtract(quota.getUsedAmount()).max(BigDecimal.ZERO);

        return new CskhQuotaStatusDto(
                actor.getId(),
                actor.getShopId(),
                currentPeriod,
                quota.getQuotaAmount(),
                quota.getUsedAmount(),
                remaining
        );
    }

    @Override
    @Transactional
    public CskhQuotaStatusDto updateStaffQuota(User admin, String staffId, UpdateCskhQuotaDto dto) {
        if (admin == null || admin.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ ADMIN mới có quyền điều chỉnh hạn mức voucher tri ân");
        }

        String period = dto.getPeriod() != null && !dto.getPeriod().isBlank()
                ? dto.getPeriod().trim()
                : LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));

        if (dto.getQuotaAmount() == null || dto.getQuotaAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hạn mức voucher không được âm");
        }

        CskhVoucherQuota quota = quotaRepository.findByStaffIdAndPeriod(staffId, period)
                .orElseGet(() -> new CskhVoucherQuota(staffId, null, period, dto.getQuotaAmount(), BigDecimal.ZERO));

        quota.setQuotaAmount(dto.getQuotaAmount());
        quota = quotaRepository.save(quota);

        BigDecimal remaining = quota.getQuotaAmount().subtract(quota.getUsedAmount()).max(BigDecimal.ZERO);

        return new CskhQuotaStatusDto(
                staffId,
                quota.getShopId(),
                period,
                quota.getQuotaAmount(),
                quota.getUsedAmount(),
                remaining
        );
    }

    @Override
    @Transactional(readOnly = true)
    public PaginatedResponseDto<OrderLookupAuditLogDto> getAuditLogs(User actor, int page, int size) {
        if (actor == null || (actor.getRole() != Role.ADMIN && actor.getRole() != Role.SHOP_OWNER)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ ADMIN hoặc SHOP_OWNER mới có quyền xem audit log tra cứu");
        }

        Pageable pageable = PageRequest.of(page, size);
        Page<OrderLookupAuditLog> logs;

        if (actor.getRole() == Role.SHOP_OWNER) {
            Long shopId = actor.getShopId();
            if (shopId == null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản SHOP_OWNER chưa được gán chi nhánh");
            }
            logs = auditLogRepository.findByActorShopIdOrderByCreatedAtDesc(shopId, pageable);
        } else {
            logs = auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
        }

        List<OrderLookupAuditLogDto> dtoList = logs.getContent().stream()
                .map(l -> new OrderLookupAuditLogDto(
                        l.getId(),
                        l.getActorId(),
                        l.getActorName(),
                        l.getActorRole(),
                        l.getActorShopId(),
                        l.getSearchType(),
                        l.getSearchQuery(),
                        l.getFoundOrderId(),
                        l.getFoundOrderCode(),
                        l.getStatus(),
                        l.getCreatedAt()
                ))
                .collect(Collectors.toList());

        return new PaginatedResponseDto<>(
                dtoList,
                logs.getTotalElements(),
                logs.getNumber(),
                logs.getSize(),
                logs.getTotalPages(),
                null
        );
    }

    private void validateStaffAccess(User actor) {
        if (actor == null || (actor.getRole() != Role.ADMIN && actor.getRole() != Role.CSKH_STAFF)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ có nhân viên CSKH hoặc ADMIN mới có quyền thực hiện thao tác này");
        }
    }

    private void enforceStaffTicketOwnership(User actor, SupportTicket ticket) {
        if (actor.getRole() == Role.CSKH_STAFF) {
            Long staffShopId = actor.getShopId();
            if (staffShopId == null || ticket.getShopId() == null || !ticket.getShopId().equals(staffShopId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xử lý ticket thuộc chi nhánh khác hoặc ticket Hội sở");
            }
        }
    }

    private void recordAudit(User actor, String searchType, String searchQuery, Long foundOrderId, String foundOrderCode, String status) {
        OrderLookupAuditLog log = new OrderLookupAuditLog(
                actor.getId(),
                actor.getFullName(),
                actor.getRole().name(),
                actor.getShopId(),
                searchType,
                searchQuery,
                foundOrderId,
                foundOrderCode,
                status
        );
        auditLogRepository.save(log);
    }

    private RestrictedOrderLookupDto toRestrictedDto(Order order) {
        List<OrderItemLookupDto> items = new ArrayList<>();
        if (order.getItems() != null) {
            items = order.getItems().stream()
                    .map(item -> new OrderItemLookupDto(
                            item.getProductNameSnapshot(),
                            item.getSizeSnapshot(),
                            item.getColorSnapshot(),
                            item.getQuantity(),
                            item.getUnitPrice() != null ? item.getUnitPrice() : 0.0
                    ))
                    .collect(Collectors.toList());
        }

        LocalDateTime estDelivery = order.getCreatedAt() != null ? order.getCreatedAt().plusDays(3) : LocalDateTime.now().plusDays(3);

        return new RestrictedOrderLookupDto(
                order.getId(),
                order.getOrderCode(),
                maskName(order.getCustomerName()),
                maskPhone(order.getCustomerPhone()),
                maskAddress(order.getShippingAddressSnapshot()),
                order.getOrderStatus(),
                order.getPaymentMethod(),
                order.getPaymentStatus(),
                order.getTotalAmount(),
                estDelivery,
                null, // shopId hidden in restricted view or assigned if needed
                items
        );
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.isBlank()) return "***";
        String clean = phone.trim();
        if (clean.length() >= 7) {
            return clean.substring(0, 3) + "****" + clean.substring(clean.length() - 3);
        }
        return "***";
    }

    private String maskName(String name) {
        if (name == null || name.isBlank()) return "Khách hàng";
        String[] parts = name.trim().split("\\s+");
        if (parts.length == 1) return parts[0].charAt(0) + "***";
        StringBuilder sb = new StringBuilder(parts[0]);
        for (int i = 1; i < parts.length; i++) {
            sb.append(" ").append(parts[i].charAt(0)).append(".");
        }
        return sb.toString();
    }

    private String maskAddress(String address) {
        if (address == null || address.isBlank()) return "***";
        String[] parts = address.split(",");
        if (parts.length > 2) {
            return "***, " + parts[parts.length - 2].trim() + ", " + parts[parts.length - 1].trim();
        }
        return "***";
    }
}
