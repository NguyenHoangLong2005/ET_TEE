package com.nguyenhoanglong;

import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import com.nguyenhoanglong.service.CskhExtendedService;
import com.nguyenhoanglong.service.MarketingService;
import com.nguyenhoanglong.service.SupportTicketService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class CskhExtendedApiIntegrationTest {

    @Autowired
    private CskhExtendedService cskhExtendedService;

    @Autowired
    private SupportTicketService ticketService;

    @Autowired
    private MarketingService marketingService;

    @Autowired
    private SupportTicketRepository ticketRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VoucherRepository voucherRepository;

    @Autowired
    private OrderLookupAuditLogRepository auditLogRepository;

    private User createUser(String email, Role role, Long shopId) {
        User user = new User();
        user.setEmail(email);
        user.setFullName("Test " + role.name());
        user.setPasswordHash("hashed_pwd");
        user.setStatus("ACTIVE");
        user.setRole(role);
        user.setShopId(shopId);
        return userRepository.save(user);
    }

    private Order createOrder(String customerName, String customerPhone, Long shopId) {
        Order order = new Order();
        order.setOrderCode("ORD-TEST-" + System.currentTimeMillis() + "-" + (int)(Math.random()*1000));
        order.setCustomerName(customerName);
        order.setCustomerPhone(customerPhone);
        order.setShippingAddressSnapshot("Số 123 Đường ABC, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh");
        order.setOrderStatus("CONFIRMED");
        order.setPaymentMethod("COD");
        order.setPaymentStatus("UNPAID");
        order.setTotalAmount(500000.0);
        order.setShopId(shopId);
        return orderRepository.save(order);
    }

    @Test
    @Transactional
    @DisplayName("Case 1: Admin Quota Adjustment (PUT /api/admin/cskh/quota/{staffId})")
    public void testCase1_AdminQuotaAdjustment() {
        User admin = createUser("admin_q_" + System.currentTimeMillis() + "@ettee.vn", Role.ADMIN, null);
        User cskh = createUser("cskh_q_" + System.currentTimeMillis() + "@ettee.vn", Role.CSKH_STAFF, 1L);

        UpdateCskhQuotaDto updateDto = new UpdateCskhQuotaDto(new BigDecimal("3000000.00"), null);
        CskhQuotaStatusDto status = cskhExtendedService.updateStaffQuota(admin, cskh.getId(), updateDto);

        assertNotNull(status);
        assertEquals(cskh.getId(), status.getStaffId());
        assertEquals(new BigDecimal("3000000.00"), status.getQuotaAmount());
        assertEquals(new BigDecimal("3000000.00"), status.getRemainingQuota());
    }

    @Test
    @Transactional
    @DisplayName("Case 2: Ticket Link Order (PATCH /api/staff/support/tickets/{id}/link-order) - Validation & Security")
    public void testCase2_TicketLinkOrder() {
        User cskhA = createUser("cskh_link_" + System.currentTimeMillis() + "@ettee.vn", Role.CSKH_STAFF, 1L);
        Order orderA = createOrder("Nguyen Van A", "0901234567", 1L);
        Order orderB = createOrder("Khach Shop 2", "0909998887", 2L);

        SupportTicket ticket = ticketRepository.save(SupportTicket.builder()
                .ticketCode("TK-LINK-" + System.currentTimeMillis())
                .customerId("cust-link-1")
                .shopId(1L)
                .subject("Test Link Order")
                .status("OPEN")
                .build());

        // 1. Cross-shop order link attempt by CSKH Shop 1 -> 403 Forbidden
        LinkOrderTicketDto dtoCrossShop = new LinkOrderTicketDto(orderB.getId());
        ResponseStatusException exCross = assertThrows(ResponseStatusException.class, () -> {
            ticketService.linkOrderToTicket(cskhA, ticket.getId(), dtoCrossShop);
        });
        assertEquals(HttpStatus.FORBIDDEN, exCross.getStatusCode());
        assertTrue(exCross.getReason().contains("chi nhánh khác"));

        // 2. Valid link order A -> Success
        LinkOrderTicketDto dto = new LinkOrderTicketDto(orderA.getId());
        SupportTicketDetailDto detail = ticketService.linkOrderToTicket(cskhA, ticket.getId(), dto);

        assertNotNull(detail);
        assertEquals(orderA.getId(), detail.getOrderId());
        assertTrue(detail.getMessages().stream().anyMatch(m -> m.getMessage().contains(orderA.getOrderCode())));

        // 3. Attempt to overwrite with another order -> 400 Bad Request
        Order orderA2 = createOrder("Nguyen Van A2", "0901234568", 1L);
        LinkOrderTicketDto dtoOverwrite = new LinkOrderTicketDto(orderA2.getId());
        ResponseStatusException exOverwrite = assertThrows(ResponseStatusException.class, () -> {
            ticketService.linkOrderToTicket(cskhA, ticket.getId(), dtoOverwrite);
        });
        assertEquals(HttpStatus.BAD_REQUEST, exOverwrite.getStatusCode());
        assertTrue(exOverwrite.getReason().contains("Ticket đã liên kết với đơn hàng khác"));
    }

    @Test
    @Transactional
    @DisplayName("Case 3: Restricted Order Lookup & Masking + Audit Log Insertion")
    public void testCase3_RestrictedOrderLookupAndMasking() {
        User cskhA = createUser("cskh_lk_" + System.currentTimeMillis() + "@ettee.vn", Role.CSKH_STAFF, 1L);
        Order orderA = createOrder("Nguyễn Văn Anh", "0908765432", 1L);

        OrderLookupRequestDto req = new OrderLookupRequestDto("PHONE", "0908765432");
        RestrictedOrderLookupDto result = cskhExtendedService.lookupOrder(cskhA, req);

        assertNotNull(result);
        assertEquals(orderA.getOrderCode(), result.getOrderCode());
        // Phone masking
        assertEquals("090****432", result.getMaskedCustomerPhone());
        // Name masking
        assertTrue(result.getMaskedCustomerName().contains("Nguyễn V. A."));
        // Address masking (detail hidden)
        assertTrue(result.getMaskedShippingAddress().contains("***"));

        // Audit Log check
        Page<OrderLookupAuditLog> auditLogs = auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 10));
        assertTrue(auditLogs.getContent().stream().anyMatch(l -> l.getSearchQuery().equals("0908765432") && "SUCCESS".equals(l.getStatus())));
    }

    @Test
    @Transactional
    @DisplayName("Case 4: Order Lookup Branch Isolation (CSKH Shop A -> Shop B order -> 403 Forbidden)")
    public void testCase4_OrderLookupBranchIsolation() {
        User cskhA = createUser("cskh_iso_a_" + System.currentTimeMillis() + "@ettee.vn", Role.CSKH_STAFF, 1L);
        Order orderB = createOrder("Khach Shop B", "0912345678", 2L);

        OrderLookupRequestDto req = new OrderLookupRequestDto("ORDER_CODE", orderB.getOrderCode());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            cskhExtendedService.lookupOrder(cskhA, req);
        });
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertTrue(ex.getReason().contains("chi nhánh khác"));
    }

    @Test
    @Transactional
    @DisplayName("Case 5: Rate Limiting Protection (11th lookup in 1 minute -> 429 Too Many Requests)")
    public void testCase5_RateLimitingProtection() {
        User cskhA = createUser("cskh_rate_" + System.currentTimeMillis() + "@ettee.vn", Role.CSKH_STAFF, 1L);
        Order order = createOrder("Khach Test Rate Limit", "0999999999", 1L);
        OrderLookupRequestDto req = new OrderLookupRequestDto("ORDER_CODE", order.getOrderCode());

        // Perform 10 lookups -> all succeed
        for (int i = 0; i < 10; i++) {
            assertNotNull(cskhExtendedService.lookupOrder(cskhA, req));
        }

        // 11th lookup -> 429 Too Many Requests
        ResponseStatusException exRate = assertThrows(ResponseStatusException.class, () -> {
            cskhExtendedService.lookupOrder(cskhA, req);
        });
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, exRate.getStatusCode());
    }

    @Test
    @Transactional
    @DisplayName("Case 6: Compensation Voucher Quota & Customer Binding Checkout Validation")
    public void testCase6_CompensationVoucherQuotaAndCustomerBinding() {
        User cskhA = createUser("cskh_v_" + System.currentTimeMillis() + "@ettee.vn", Role.CSKH_STAFF, 1L);
        User custA = createUser("cust_va_" + System.currentTimeMillis() + "@customer.com", Role.USER, null);
        User custB = createUser("cust_vb_" + System.currentTimeMillis() + "@customer.com", Role.USER, null);

        SupportTicket ticket = ticketRepository.save(SupportTicket.builder()
                .ticketCode("TK-VOUCH-" + System.currentTimeMillis())
                .customerId(custA.getId())
                .shopId(1L)
                .subject("Test Voucher Compensation")
                .status("IN_PROGRESS")
                .build());

        // 1. Issue valid 100k voucher
        IssueCompensationVoucherDto grantDto = new IssueCompensationVoucherDto(ticket.getId(), new BigDecimal("100000"), "Giao hang truyen tre");
        CskhVoucherGrantDto grantResult = cskhExtendedService.issueCompensationVoucher(cskhA, grantDto);

        assertNotNull(grantResult);
        assertTrue(grantResult.getVoucherCode().startsWith("CSKH-"));
        assertEquals(new BigDecimal("100000"), grantResult.getAmount());
        assertEquals(new BigDecimal("1900000.00"), grantResult.getRemainingQuota());

        // 2. Issue 2nd voucher for SAME ticket -> 400 Bad Request
        ResponseStatusException exDuplicate = assertThrows(ResponseStatusException.class, () -> {
            cskhExtendedService.issueCompensationVoucher(cskhA, grantDto);
        });
        assertEquals(HttpStatus.BAD_REQUEST, exDuplicate.getStatusCode());
        assertTrue(exDuplicate.getReason().contains("tối đa 1 voucher"));

        // 3. Customer B checkout using Customer A's voucher -> 400 Bad Request ("Mã voucher tri ân này không thuộc về tài khoản của bạn")
        ResponseStatusException exCustomerMismatch = assertThrows(ResponseStatusException.class, () -> {
            marketingService.validateVoucher(grantResult.getVoucherCode(), new BigDecimal("300000"), custB.getId(), false);
        });
        assertEquals(HttpStatus.BAD_REQUEST, exCustomerMismatch.getStatusCode());
        assertTrue(exCustomerMismatch.getReason().contains("không thuộc về tài khoản của bạn"));

        // 4. Customer A checkout using Customer A's voucher -> Success!
        Voucher validVoucher = marketingService.validateVoucher(grantResult.getVoucherCode(), new BigDecimal("300000"), custA.getId(), false);
        assertNotNull(validVoucher);
        assertEquals(grantResult.getVoucherCode(), validVoucher.getCode());
        assertEquals(custA.getId(), validVoucher.getGrantedToCustomerId());
    }

    @Test
    @Transactional
    @DisplayName("Case 7: Audit Log RBAC (Shop Owner Shop A only sees Shop A logs, CSKH_STAFF -> 403 Forbidden)")
    public void testCase7_AuditLogRbac() {
        User ownerA = createUser("owner_aud_a_" + System.currentTimeMillis() + "@ettee.vn", Role.SHOP_OWNER, 1L);
        User cskhA = createUser("cskh_aud_a_" + System.currentTimeMillis() + "@ettee.vn", Role.CSKH_STAFF, 1L);
        Order orderA = createOrder("Khach Audit Shop A", "0933333333", 1L);

        // Perform lookup by CSKH Shop A
        cskhExtendedService.lookupOrder(cskhA, new OrderLookupRequestDto("ORDER_CODE", orderA.getOrderCode()));

        // CSKH_STAFF fetching audit logs -> 403 Forbidden
        ResponseStatusException exCskh = assertThrows(ResponseStatusException.class, () -> {
            cskhExtendedService.getAuditLogs(cskhA, 0, 10);
        });
        assertEquals(HttpStatus.FORBIDDEN, exCskh.getStatusCode());

        // Shop Owner Shop A fetching audit logs -> Success
        PaginatedResponseDto<OrderLookupAuditLogDto> ownerLogs = cskhExtendedService.getAuditLogs(ownerA, 0, 10);
        assertNotNull(ownerLogs);
        assertTrue(ownerLogs.getItems().stream().allMatch(l -> Long.valueOf(1L).equals(l.getActorShopId())));
    }
}
