package com.nguyenhoanglong.service.impl;

import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import com.nguyenhoanglong.service.SupportTicketService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SupportTicketServiceImpl implements SupportTicketService {

    private final SupportTicketRepository ticketRepository;
    private final TicketMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final SystemNotificationRepository notificationRepository;

    private static final Map<String, Set<String>> ALLOWED_TRANSITIONS = Map.of(
            "OPEN", Set.of("IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED"),
            "IN_PROGRESS", Set.of("ESCALATED", "RESOLVED", "CLOSED"),
            "ESCALATED", Set.of("IN_PROGRESS", "RESOLVED", "CLOSED"),
            "RESOLVED", Set.of("CLOSED", "IN_PROGRESS"),
            "CLOSED", Set.of("IN_PROGRESS") // Only for ADMIN
    );

    public SupportTicketServiceImpl(SupportTicketRepository ticketRepository,
                                    TicketMessageRepository messageRepository,
                                    UserRepository userRepository,
                                    OrderRepository orderRepository,
                                    SystemNotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
        this.ticketRepository = ticketRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
    }

    // ----------------------------------------------------
    // STAFF PORTAL APIs
    // ----------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public PaginatedResponseDto<SupportTicketDto> getStaffTickets(User actor, int page, int size, String status, Integer priority, String assignedTo, String search) {
        validateStaffAccess(actor);

        boolean isBranchStaff = actor.getRole() != Role.ADMIN;
        Long staffShopId = actor.getShopId();

        if (isBranchStaff && staffShopId == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản chưa được gán chi nhánh");
        }

        // Thu tu (hang doi) nam trong ORDER BY cua findStaffTickets; khong truyen Sort them.
        Pageable pageable = PageRequest.of(page, size);
        Page<SupportTicket> ticketPage = ticketRepository.findStaffTickets(
                isBranchStaff,
                staffShopId,
                (status == null || status.isBlank()) ? null : status.trim(),
                priority,
                (assignedTo == null || assignedTo.isBlank()) ? null : assignedTo.trim(),
                search == null ? "" : search.trim(), // never null, see findStaffTickets
                pageable
        );

        List<SupportTicketDto> dtoList = ticketPage.getContent().stream()
                .map(this::toDto)
                .collect(Collectors.toList());

        return new PaginatedResponseDto<>(
                dtoList,
                ticketPage.getTotalElements(),
                ticketPage.getNumber(),
                ticketPage.getSize(),
                ticketPage.getTotalPages(),
                null
        );
    }

    @Override
    @Transactional(readOnly = true)
    public SupportTicketDetailDto getStaffTicketById(User actor, String id) {
        validateStaffAccess(actor);
        SupportTicket ticket = findTicketOrThrow(id);
        enforceStaffTicketOwnership(actor, ticket);
        return toDetailDto(ticket);
    }

    @Override
    @Transactional
    public SupportTicketDetailDto createStaffTicket(User actor, CreateTicketDto dto) {
        validateStaffAccess(actor);

        Long resolvedShopId = resolveShopFromOrder(dto.getOrderId(), dto.getShopId());

        if (actor.getRole() != Role.ADMIN) {
            if (dto.getOrderId() != null && resolvedShopId != null && !resolvedShopId.equals(actor.getShopId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không thể tạo ticket cho đơn hàng thuộc chi nhánh khác");
            }
            resolvedShopId = actor.getShopId();
        }

        String ticketCode = generateTicketCode();
        SupportTicket ticket = SupportTicket.builder()
                .ticketCode(ticketCode)
                .customerId(dto.getCustomerId())
                .orderId(dto.getOrderId())
                .shopId(resolvedShopId)
                .channel(dto.getChannel() != null ? dto.getChannel() : "CHAT")
                .subject(dto.getSubject())
                .status("OPEN")
                .priority(dto.getPriority() != null ? dto.getPriority() : 3)
                .assignedTo(actor.getId())
                .build();

        ticket = ticketRepository.save(ticket);

        TicketMessage initialMsg = TicketMessage.builder()
                .ticketId(ticket.getId())
                .senderType("STAFF")
                .senderId(actor.getId())
                .senderName(actor.getFullName())
                .message(dto.getInitialMessage())
                .build();
        messageRepository.save(initialMsg);

        return toDetailDto(ticket);
    }

    @Override
    @Transactional
    public SupportTicketDto updateTicketStatus(User actor, String id, UpdateTicketStatusDto dto) {
        validateStaffAccess(actor);
        SupportTicket ticket = findTicketOrThrow(id);
        enforceStaffTicketOwnership(actor, ticket);

        String fromStatus = ticket.getStatus();
        String toStatus = dto.getStatus();

        if (fromStatus.equalsIgnoreCase(toStatus)) {
            return toDto(ticket);
        }

        if (fromStatus.equalsIgnoreCase("CLOSED") && actor.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ticket đã đóng, không thể thay đổi trạng thái");
        }

        Set<String> validNext = ALLOWED_TRANSITIONS.getOrDefault(fromStatus, Set.of());
        if (!validNext.contains(toStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể chuyển trạng thái ticket từ " + fromStatus + " sang " + toStatus);
        }

        ticket.setStatus(toStatus);
        if (toStatus.equalsIgnoreCase("IN_PROGRESS") && ticket.getAssignedTo() == null) {
            ticket.setAssignedTo(actor.getId());
        }

        if (toStatus.equalsIgnoreCase("RESOLVED") || toStatus.equalsIgnoreCase("CLOSED")) {
            ticket.setResolvedAt(LocalDateTime.now());
        }

        ticket = ticketRepository.save(ticket);

        if (dto.getNote() != null && !dto.getNote().isBlank()) {
            TicketMessage noteMsg = TicketMessage.builder()
                    .ticketId(ticket.getId())
                    .senderType("SYSTEM")
                    .senderId(actor.getId())
                    .senderName(actor.getFullName())
                    .message("Trạng thái ticket được cập nhật thành " + toStatus + ". Ghi chú: " + dto.getNote())
                    .build();
            messageRepository.save(noteMsg);
        }

        return toDto(ticket);
    }

    @Override
    @Transactional
    public TicketMessageDto addStaffMessage(User actor, String id, AddTicketMessageDto dto) {
        validateStaffAccess(actor);
        SupportTicket ticket = findTicketOrThrow(id);
        enforceStaffTicketOwnership(actor, ticket);

        if (ticket.getStatus().equalsIgnoreCase("CLOSED") && actor.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ticket đã đóng, không thể gửi tin nhắn mới");
        }

        if (ticket.getStatus().equalsIgnoreCase("OPEN")) {
            ticket.setStatus("IN_PROGRESS");
            if (ticket.getAssignedTo() == null) {
                ticket.setAssignedTo(actor.getId());
            }
            ticketRepository.save(ticket);
        }

        TicketMessage msg = TicketMessage.builder()
                .ticketId(ticket.getId())
                .senderType("STAFF")
                .senderId(actor.getId())
                .senderName(actor.getFullName())
                .message(dto.getMessage())
                .attachmentUrl(dto.getAttachmentUrl())
                .build();

        msg = messageRepository.save(msg);
        return toMessageDto(msg);
    }

    @Override
    @Transactional
    public SupportTicketDto assignTicket(User actor, String id, AssignTicketDto dto) {
        validateStaffAccess(actor);
        SupportTicket ticket = findTicketOrThrow(id);
        enforceStaffTicketOwnership(actor, ticket);

        if (dto.getAssignedTo() != null) {
            User targetStaff = userRepository.findById(dto.getAssignedTo())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nhân viên được gán không tồn tại"));

            if (targetStaff.getRole() != Role.CSKH_STAFF && targetStaff.getRole() != Role.ADMIN) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nhân viên được phân công phải thuộc vai trò CSKH_STAFF hoặc ADMIN");
            }

            if (targetStaff.getRole() == Role.CSKH_STAFF) {
                // A head-office ticket (customer question with no order, shopId null) could never be
                // handed to any CSKH agent, so only ADMIN could ever answer one. The admin now routes
                // it: the ticket moves to the assignee's branch.
                if (ticket.getShopId() == null && actor.getRole() == Role.ADMIN && targetStaff.getShopId() != null) {
                    ticket.setShopId(targetStaff.getShopId());
                }
                if (targetStaff.getShopId() == null || !targetStaff.getShopId().equals(ticket.getShopId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ có thể gán ticket cho nhân viên CSKH cùng chi nhánh");
                }
            }
            ticket.setAssignedTo(targetStaff.getId());
            notifyUser(targetStaff.getId(), "TICKET_ASSIGNED", "Bạn được phân công ticket",
                    "[" + ticket.getTicketCode() + "] " + ticket.getSubject(), "INFO");
        }

        if (dto.getEscalatedTo() != null) {
            User targetManager = userRepository.findById(dto.getEscalatedTo())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quản lý leo thang không tồn tại"));

            if (targetManager.getRole() != Role.SHOP_OWNER && targetManager.getRole() != Role.ADMIN) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ có thể leo thang ticket lên quản lý SHOP_OWNER hoặc ADMIN");
            }

            if (targetManager.getRole() == Role.SHOP_OWNER) {
                if (targetManager.getShopId() == null || !targetManager.getShopId().equals(ticket.getShopId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ có thể leo thang ticket lên quản lý cùng chi nhánh");
                }
            }
            ticket.setEscalatedTo(targetManager.getId());
            ticket.setStatus("ESCALATED");
            notifyUser(targetManager.getId(), "TICKET_ESCALATED", "Ticket được leo thang lên bạn",
                    "[" + ticket.getTicketCode() + "] " + ticket.getSubject(), "WARNING");
        }

        ticket = ticketRepository.save(ticket);

        if (dto.getNote() != null && !dto.getNote().isBlank()) {
            TicketMessage sysMsg = TicketMessage.builder()
                    .ticketId(ticket.getId())
                    .senderType("SYSTEM")
                    .senderId(actor.getId())
                    .senderName(actor.getFullName())
                    .message("Cập nhật phân công ticket. Ghi chú: " + dto.getNote())
                    .build();
            messageRepository.save(sysMsg);
        }

        return toDto(ticket);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserCandidateDto> getAssignableStaffCandidates(User actor, String ticketId) {
        validateStaffAccess(actor);
        SupportTicket ticket = findTicketOrThrow(ticketId);
        enforceStaffTicketOwnership(actor, ticket);

        List<User> users = userRepository.findAssignableStaffForShop(ticket.getShopId());
        return users.stream()
                .map(u -> new UserCandidateDto(u.getId(), u.getFullName(), u.getEmail(), u.getRole().name(), u.getShopId()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserCandidateDto> getEscalatableOwnerCandidates(User actor, String ticketId) {
        validateStaffAccess(actor);
        SupportTicket ticket = findTicketOrThrow(ticketId);
        enforceStaffTicketOwnership(actor, ticket);

        List<User> users = userRepository.findEscalatableOwnersForShop(ticket.getShopId());
        return users.stream()
                .map(u -> new UserCandidateDto(u.getId(), u.getFullName(), u.getEmail(), u.getRole().name(), u.getShopId()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserCandidateDto> getAllStaffCandidates(User actor) {
        if (actor == null || actor.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ ADMIN mới có quyền truy cập danh sách toàn bộ nhân sự hệ thống");
        }
        List<User> users = userRepository.findAllStaffAndOwners();
        return users.stream()
                .map(u -> new UserCandidateDto(u.getId(), u.getFullName(), u.getEmail(), u.getRole().name(), u.getShopId()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public SupportTicketDetailDto linkOrderToTicket(User actor, String ticketId, LinkOrderTicketDto dto) {
        validateStaffAccess(actor);
        SupportTicket ticket = findTicketOrThrow(ticketId);
        enforceStaffTicketOwnership(actor, ticket);

        if (ticket.getOrderId() != null && !ticket.getOrderId().equals(dto.getOrderId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ticket đã liên kết với đơn hàng khác, vui lòng gỡ liên kết cũ trước");
        }

        Order order = orderRepository.findById(dto.getOrderId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng ID: " + dto.getOrderId()));

        if (actor.getRole() != Role.ADMIN) {
            if (actor.getShopId() == null || order.getShopId() == null || !actor.getShopId().equals(order.getShopId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không thể liên kết đơn hàng thuộc chi nhánh khác vào ticket này");
            }
        }

        ticket.setOrderId(order.getId());
        if (ticket.getShopId() == null && order.getShopId() != null) {
            ticket.setShopId(order.getShopId());
        }

        ticket = ticketRepository.save(ticket);

        TicketMessage sysMsg = TicketMessage.builder()
                .ticketId(ticket.getId())
                .senderType("SYSTEM")
                .senderId(actor.getId())
                .senderName(actor.getFullName())
                .message("Đã liên kết đơn hàng #" + order.getOrderCode() + " vào ticket này.")
                .build();
        messageRepository.save(sysMsg);

        return toDetailDto(ticket);
    }

    // ----------------------------------------------------
    // CUSTOMER STOREFRONT APIs
    // ----------------------------------------------------

    @Override
    @Transactional
    public SupportTicketDetailDto createCustomerTicket(User customer, CreateTicketDto dto) {
        // Don hang lien ket phai la cua chinh khach; chi nhanh xu ly suy ra tu don hang.
        Long resolvedShopId = null;
        if (dto.getOrderId() != null) {
            Order order = orderRepository.findById(dto.getOrderId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không tìm thấy đơn hàng được chọn"));
            if (order.getUser() == null || !customer.getId().equals(order.getUser().getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Đơn hàng này không thuộc tài khoản của bạn");
            }
            resolvedShopId = order.getShopId();
        }

        String ticketCode = generateTicketCode();
        SupportTicket ticket = SupportTicket.builder()
                .ticketCode(ticketCode)
                .customerId(customer.getId())
                .orderId(dto.getOrderId())
                .shopId(resolvedShopId)
                .channel("CHAT")
                .subject(dto.getSubject())
                .status("OPEN")
                .priority(dto.getPriority() != null ? Math.min(Math.max(dto.getPriority(), 1), 5) : 3)
                .build();

        ticket = ticketRepository.save(ticket);
        notifyTicketHandlers(ticket, "TICKET_NEW", "Có ticket hỗ trợ mới",
                "[" + ticket.getTicketCode() + "] " + ticket.getSubject(), "INFO");

        TicketMessage initialMsg = TicketMessage.builder()
                .ticketId(ticket.getId())
                .senderType("CUSTOMER")
                .senderId(customer.getId())
                .senderName(customer.getFullName())
                .message(dto.getInitialMessage())
                .build();
        messageRepository.save(initialMsg);

        return toDetailDto(ticket);
    }

    @Override
    @Transactional(readOnly = true)
    public PaginatedResponseDto<SupportTicketDto> getCustomerTickets(User customer, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<SupportTicket> pageResult = ticketRepository.findByCustomerIdOrderByCreatedAtDesc(customer.getId(), pageable);

        List<SupportTicketDto> dtoList = pageResult.getContent().stream()
                .map(this::toDto)
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

    @Override
    @Transactional(readOnly = true)
    public SupportTicketDetailDto getCustomerTicketById(User customer, String id) {
        SupportTicket ticket = findTicketOrThrow(id);
        enforceCustomerOwnership(customer, ticket);
        return toDetailDto(ticket);
    }

    @Override
    @Transactional
    public TicketMessageDto addCustomerMessage(User customer, String id, AddTicketMessageDto dto) {
        SupportTicket ticket = findTicketOrThrow(id);
        enforceCustomerOwnership(customer, ticket);

        if (ticket.getStatus().equalsIgnoreCase("CLOSED")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ticket hỗ trợ này đã đóng. Vui lòng tạo yêu cầu hỗ trợ mới nếu bạn cần trợ giúp thêm.");
        }

        if (ticket.getStatus().equalsIgnoreCase("RESOLVED")) {
            ticket.setStatus("IN_PROGRESS");
            ticket.setResolvedAt(null);
            ticketRepository.save(ticket);
        }

        TicketMessage msg = TicketMessage.builder()
                .ticketId(ticket.getId())
                .senderType("CUSTOMER")
                .senderId(customer.getId())
                .senderName(customer.getFullName())
                .message(dto.getMessage())
                .attachmentUrl(dto.getAttachmentUrl())
                .build();

        msg = messageRepository.save(msg);
        notifyTicketHandlers(ticket, "TICKET_CUSTOMER_REPLY", "Khách hàng vừa phản hồi ticket",
                "[" + ticket.getTicketCode() + "] " + ticket.getSubject(), "INFO");
        return toMessageDto(msg);
    }

    // ----------------------------------------------------
    // HELPER METHODS
    // ----------------------------------------------------

    private void validateStaffAccess(User actor) {
        if (actor == null || (actor.getRole() != Role.ADMIN && actor.getRole() != Role.CSKH_STAFF && actor.getRole() != Role.SHOP_OWNER)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ có nhân viên CSKH, chủ cửa hàng hoặc ADMIN mới có quyền thực hiện thao tác này");
        }
    }

    private SupportTicket findTicketOrThrow(String id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ticket hỗ trợ có ID: " + id));
    }

    private void enforceStaffTicketOwnership(User actor, SupportTicket ticket) {
        if (actor.getRole() != Role.ADMIN) {
            Long staffShopId = actor.getShopId();
            if (staffShopId == null || ticket.getShopId() == null || !ticket.getShopId().equals(staffShopId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xử lý ticket thuộc chi nhánh khác hoặc ticket Hội sở");
            }
        }
    }

    private void enforceCustomerOwnership(User customer, SupportTicket ticket) {
        if (ticket.getCustomerId() == null || !ticket.getCustomerId().equals(customer.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập hoặc thao tác trên ticket hỗ trợ này");
        }
    }

    private Long resolveShopFromOrder(Long orderId, Long fallback) {
        if (orderId == null) return fallback;
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không tìm thấy đơn hàng ID: " + orderId));
        return order.getShopId() != null ? order.getShopId() : fallback;
    }

    /** Nguoi xu ly: nguoi duoc giao; neu chua giao thi CSKH cua chi nhanh; ticket Hoi so thi ADMIN. */
    private void notifyTicketHandlers(SupportTicket ticket, String type, String title, String message, String severity) {
        try {
            if (ticket.getAssignedTo() != null) {
                notifyUser(ticket.getAssignedTo(), type, title, message, severity);
                return;
            }
            List<User> recipients = ticket.getShopId() != null
                    ? userRepository.findByShopId(ticket.getShopId()).stream()
                            .filter(u -> u.getRole() == Role.CSKH_STAFF && "ACTIVE".equalsIgnoreCase(u.getStatus()))
                            .collect(Collectors.toList())
                    : userRepository.findByRoleAndStatus(Role.ADMIN, "ACTIVE");
            for (User u : recipients) notifyUser(u.getId(), type, title, message, severity);
        } catch (Exception ignored) {
            // Thong bao that bai khong duoc lam hong thao tac chinh.
        }
    }

    private void notifyUser(String userId, String type, String title, String message, String severity) {
        try {
            SystemNotification n = new SystemNotification();
            n.setType(type);
            n.setTitle(title);
            n.setMessage(message);
            n.setSeverity(severity);
            n.setTargetUrl("/staff/tickets");
            n.setRecipientUserId(userId);
            notificationRepository.save(n);
        } catch (Exception ignored) {
        }
    }

    private String generateTicketCode() {
        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randomStr = String.format("%04d", new Random().nextInt(10000));
        return "TK-" + dateStr + "-" + randomStr;
    }

    private SupportTicketDto toDto(SupportTicket ticket) {
        TicketMessage lastMsg = messageRepository.findFirstByTicketIdOrderByCreatedAtDesc(ticket.getId()).orElse(null);
        
        String customerName = null;
        String customerEmail = null;
        if (ticket.getCustomerId() != null) {
            User c = userRepository.findById(ticket.getCustomerId()).orElse(null);
            if (c != null) {
                customerName = c.getFullName();
                customerEmail = c.getEmail();
            }
        }

        String assignedToName = null;
        if (ticket.getAssignedTo() != null) {
            User staff = userRepository.findById(ticket.getAssignedTo()).orElse(null);
            if (staff != null) assignedToName = staff.getFullName();
        }

        String escalatedToName = null;
        if (ticket.getEscalatedTo() != null) {
            User mgr = userRepository.findById(ticket.getEscalatedTo()).orElse(null);
            if (mgr != null) escalatedToName = mgr.getFullName();
        }

        String orderCode = null;
        if (ticket.getOrderId() != null) {
            Order o = orderRepository.findById(ticket.getOrderId()).orElse(null);
            if (o != null) orderCode = o.getOrderCode();
        }

        return SupportTicketDto.builder()
                .id(ticket.getId())
                .ticketCode(ticket.getTicketCode())
                .customerId(ticket.getCustomerId())
                .customerName(customerName)
                .customerEmail(customerEmail)
                .orderId(ticket.getOrderId())
                .orderCode(orderCode)
                .shopId(ticket.getShopId())
                .channel(ticket.getChannel())
                .subject(ticket.getSubject())
                .status(ticket.getStatus())
                .priority(ticket.getPriority())
                .assignedTo(ticket.getAssignedTo())
                .assignedToName(assignedToName)
                .escalatedTo(ticket.getEscalatedTo())
                .escalatedToName(escalatedToName)
                .createdAt(ticket.getCreatedAt())
                .resolvedAt(ticket.getResolvedAt())
                .lastMessage(lastMsg != null ? toMessageDto(lastMsg) : null)
                .build();
    }

    private SupportTicketDetailDto toDetailDto(SupportTicket ticket) {
        List<TicketMessageDto> messageDtos = messageRepository.findByTicketIdOrderByCreatedAtAsc(ticket.getId())
                .stream()
                .map(this::toMessageDto)
                .collect(Collectors.toList());

        String customerName = null;
        String customerEmail = null;
        String customerPhone = null;
        if (ticket.getCustomerId() != null) {
            User c = userRepository.findById(ticket.getCustomerId()).orElse(null);
            if (c != null) {
                customerName = c.getFullName();
                customerEmail = c.getEmail();
                customerPhone = c.getPhone();
            }
        }

        String assignedToName = null;
        if (ticket.getAssignedTo() != null) {
            User staff = userRepository.findById(ticket.getAssignedTo()).orElse(null);
            if (staff != null) assignedToName = staff.getFullName();
        }

        String escalatedToName = null;
        if (ticket.getEscalatedTo() != null) {
            User mgr = userRepository.findById(ticket.getEscalatedTo()).orElse(null);
            if (mgr != null) escalatedToName = mgr.getFullName();
        }

        String orderCode = null;
        if (ticket.getOrderId() != null) {
            Order o = orderRepository.findById(ticket.getOrderId()).orElse(null);
            if (o != null) orderCode = o.getOrderCode();
        }

        return SupportTicketDetailDto.builder()
                .id(ticket.getId())
                .ticketCode(ticket.getTicketCode())
                .customerId(ticket.getCustomerId())
                .customerName(customerName)
                .customerEmail(customerEmail)
                .customerPhone(customerPhone)
                .orderId(ticket.getOrderId())
                .orderCode(orderCode)
                .shopId(ticket.getShopId())
                .channel(ticket.getChannel())
                .subject(ticket.getSubject())
                .status(ticket.getStatus())
                .priority(ticket.getPriority())
                .assignedTo(ticket.getAssignedTo())
                .assignedToName(assignedToName)
                .escalatedTo(ticket.getEscalatedTo())
                .escalatedToName(escalatedToName)
                .createdAt(ticket.getCreatedAt())
                .resolvedAt(ticket.getResolvedAt())
                .messages(messageDtos)
                .build();
    }

    private TicketMessageDto toMessageDto(TicketMessage msg) {
        return TicketMessageDto.builder()
                .id(msg.getId())
                .ticketId(msg.getTicketId())
                .senderType(msg.getSenderType())
                .senderId(msg.getSenderId())
                .senderName(msg.getSenderName())
                .message(msg.getMessage())
                .attachmentUrl(msg.getAttachmentUrl())
                .createdAt(msg.getCreatedAt())
                .build();
    }
}
