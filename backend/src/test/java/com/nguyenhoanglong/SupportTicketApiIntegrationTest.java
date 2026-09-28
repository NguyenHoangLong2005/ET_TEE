package com.nguyenhoanglong;

import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.entity.*;
import com.nguyenhoanglong.repository.*;
import com.nguyenhoanglong.service.SupportTicketService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class SupportTicketApiIntegrationTest {

    @Autowired
    private SupportTicketService ticketService;

    @Autowired
    private SupportTicketRepository ticketRepository;

    @Autowired
    private TicketMessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

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

    @Test
    @Transactional
    @DisplayName("Case 1: CSKH_STAFF của Shop A không xem/xử lý được ticket của Shop B (403) và ticket shopId=null (403)")
    public void testCase1_CskhStaffShopIsolation() {
        User cskhA = createUser("cskh_a_" + System.currentTimeMillis() + "@ettee.vn", Role.CSKH_STAFF, 1L);
        User cskhB = createUser("cskh_b_" + System.currentTimeMillis() + "@ettee.vn", Role.CSKH_STAFF, 2L);

        SupportTicket ticketShopA = ticketRepository.save(SupportTicket.builder()
                .ticketCode("TK-SHOP-A-" + System.currentTimeMillis())
                .customerId("cust-1")
                .shopId(1L)
                .subject("Test Shop A Ticket")
                .status("OPEN")
                .build());

        SupportTicket ticketShopB = ticketRepository.save(SupportTicket.builder()
                .ticketCode("TK-SHOP-B-" + System.currentTimeMillis())
                .customerId("cust-2")
                .shopId(2L)
                .subject("Test Shop B Ticket")
                .status("OPEN")
                .build());

        SupportTicket ticketHQ = ticketRepository.save(SupportTicket.builder()
                .ticketCode("TK-HQ-" + System.currentTimeMillis())
                .customerId("cust-3")
                .shopId(null)
                .subject("Test HQ Ticket")
                .status("OPEN")
                .build());

        // CSKH A can get Shop A ticket
        assertNotNull(ticketService.getStaffTicketById(cskhA, ticketShopA.getId()));

        // CSKH A getting Shop B ticket throws 403
        ResponseStatusException exShopB = assertThrows(ResponseStatusException.class, () -> {
            ticketService.getStaffTicketById(cskhA, ticketShopB.getId());
        });
        assertEquals(HttpStatus.FORBIDDEN, exShopB.getStatusCode());

        // CSKH A getting HQ ticket (shopId=null) throws 403
        ResponseStatusException exHQ = assertThrows(ResponseStatusException.class, () -> {
            ticketService.getStaffTicketById(cskhA, ticketHQ.getId());
        });
        assertEquals(HttpStatus.FORBIDDEN, exHQ.getStatusCode());
    }

    @Test
    @Transactional
    @DisplayName("Case 2: Assign ticket cho CSKH_STAFF khác chi nhánh (400) & Escalate lên SHOP_OWNER khác chi nhánh (400)")
    public void testCase2_AssignAndEscalateBranchValidation() {
        User cskhA = createUser("cskh_a2_" + System.currentTimeMillis() + "@ettee.vn", Role.CSKH_STAFF, 1L);
        User cskhB = createUser("cskh_b2_" + System.currentTimeMillis() + "@ettee.vn", Role.CSKH_STAFF, 2L);
        User ownerB = createUser("owner_b2_" + System.currentTimeMillis() + "@ettee.vn", Role.SHOP_OWNER, 2L);

        SupportTicket ticketShopA = ticketRepository.save(SupportTicket.builder()
                .ticketCode("TK-ASSIGN-A-" + System.currentTimeMillis())
                .customerId("cust-1")
                .shopId(1L)
                .subject("Test Assign Ticket")
                .status("OPEN")
                .build());

        // Assign to CSKH B (different shop) -> 400
        AssignTicketDto dtoAssignDiffShop = AssignTicketDto.builder()
                .assignedTo(cskhB.getId())
                .build();

        ResponseStatusException exAssign = assertThrows(ResponseStatusException.class, () -> {
            ticketService.assignTicket(cskhA, ticketShopA.getId(), dtoAssignDiffShop);
        });
        assertEquals(HttpStatus.BAD_REQUEST, exAssign.getStatusCode());
        assertTrue(exAssign.getReason().contains("cùng chi nhánh"));

        // Escalate to Owner B (different shop) -> 400
        AssignTicketDto dtoEscalateDiffShop = AssignTicketDto.builder()
                .escalatedTo(ownerB.getId())
                .build();

        ResponseStatusException exEscalate = assertThrows(ResponseStatusException.class, () -> {
            ticketService.assignTicket(cskhA, ticketShopA.getId(), dtoEscalateDiffShop);
        });
        assertEquals(HttpStatus.BAD_REQUEST, exEscalate.getStatusCode());
        assertTrue(exEscalate.getReason().contains("cùng chi nhánh"));
    }

    @Test
    @Transactional
    @DisplayName("Case 3: State Machine Validation & Admin CLOSED Override")
    public void testCase3_StateMachineValidation() {
        User cskh = createUser("cskh_sm_" + System.currentTimeMillis() + "@ettee.vn", Role.CSKH_STAFF, 1L);
        User admin = createUser("admin_sm_" + System.currentTimeMillis() + "@ettee.vn", Role.ADMIN, null);

        SupportTicket ticketResolved = ticketRepository.save(SupportTicket.builder()
                .ticketCode("TK-SM-RESOLVED-" + System.currentTimeMillis())
                .customerId("cust-1")
                .shopId(1L)
                .subject("Test State Machine")
                .status("RESOLVED")
                .build());

        // RESOLVED -> ESCALATED is invalid for any role -> 400
        UpdateTicketStatusDto invalidTransitionDto = UpdateTicketStatusDto.builder()
                .status("ESCALATED")
                .build();

        ResponseStatusException exInvalidTransition = assertThrows(ResponseStatusException.class, () -> {
            ticketService.updateTicketStatus(cskh, ticketResolved.getId(), invalidTransitionDto);
        });
        assertEquals(HttpStatus.BAD_REQUEST, exInvalidTransition.getStatusCode());
        assertTrue(exInvalidTransition.getReason().contains("Không thể chuyển trạng thái"));

        // Set ticket to CLOSED
        SupportTicket ticketClosed = ticketRepository.save(SupportTicket.builder()
                .ticketCode("TK-SM-CLOSED-" + System.currentTimeMillis())
                .customerId("cust-1")
                .shopId(1L)
                .subject("Test Closed Ticket")
                .status("CLOSED")
                .build());

        // CSKH modifying CLOSED ticket -> 400
        UpdateTicketStatusDto reopenDto = UpdateTicketStatusDto.builder()
                .status("IN_PROGRESS")
                .build();

        ResponseStatusException exClosedCskh = assertThrows(ResponseStatusException.class, () -> {
            ticketService.updateTicketStatus(cskh, ticketClosed.getId(), reopenDto);
        });
        assertEquals(HttpStatus.BAD_REQUEST, exClosedCskh.getStatusCode());
        assertEquals("Ticket đã đóng, không thể thay đổi trạng thái", exClosedCskh.getReason());

        // ADMIN modifying CLOSED ticket -> IN_PROGRESS -> Success
        SupportTicketDto updatedByAdmin = ticketService.updateTicketStatus(admin, ticketClosed.getId(), reopenDto);
        assertEquals("IN_PROGRESS", updatedByAdmin.getStatus());
    }

    @Test
    @Transactional
    @DisplayName("Case 4: Customer IDOR Check (Customer A vs Customer B -> 403)")
    public void testCase4_CustomerTicketIdorProtection() {
        User custA = createUser("cust_a_" + System.currentTimeMillis() + "@customer.com", Role.USER, null);
        User custB = createUser("cust_b_" + System.currentTimeMillis() + "@customer.com", Role.USER, null);

        SupportTicket ticketCustA = ticketRepository.save(SupportTicket.builder()
                .ticketCode("TK-CUST-A-" + System.currentTimeMillis())
                .customerId(custA.getId())
                .shopId(1L)
                .subject("Customer A Ticket")
                .status("OPEN")
                .build());

        // Customer B accessing Customer A's ticket -> 403
        ResponseStatusException exGet = assertThrows(ResponseStatusException.class, () -> {
            ticketService.getCustomerTicketById(custB, ticketCustA.getId());
        });
        assertEquals(HttpStatus.FORBIDDEN, exGet.getStatusCode());

        // Customer B posting message to Customer A's ticket -> 403
        AddTicketMessageDto addMsgDto = AddTicketMessageDto.builder()
                .message("Unauthorized reply")
                .build();

        ResponseStatusException exPost = assertThrows(ResponseStatusException.class, () -> {
            ticketService.addCustomerMessage(custB, ticketCustA.getId(), addMsgDto);
        });
        assertEquals(HttpStatus.FORBIDDEN, exPost.getStatusCode());
    }

    @Test
    @Transactional
    @DisplayName("Case 5: Customer messaging to CLOSED ticket -> 400 Bad Request")
    public void testCase5_ClosedTicketCustomerMessageRejection() {
        User custA = createUser("cust_a5_" + System.currentTimeMillis() + "@customer.com", Role.USER, null);

        SupportTicket ticketClosed = ticketRepository.save(SupportTicket.builder()
                .ticketCode("TK-CUST-CLOSED-" + System.currentTimeMillis())
                .customerId(custA.getId())
                .shopId(1L)
                .subject("Closed Ticket Test")
                .status("CLOSED")
                .build());

        AddTicketMessageDto addMsgDto = AddTicketMessageDto.builder()
                .message("Cần hỏi thêm thông tin")
                .build();

        ResponseStatusException exClosedMsg = assertThrows(ResponseStatusException.class, () -> {
            ticketService.addCustomerMessage(custA, ticketClosed.getId(), addMsgDto);
        });
        assertEquals(HttpStatus.BAD_REQUEST, exClosedMsg.getStatusCode());
        assertEquals("Ticket hỗ trợ này đã đóng. Vui lòng tạo yêu cầu hỗ trợ mới nếu bạn cần trợ giúp thêm.", exClosedMsg.getReason());
    }

    @Test
    @Transactional
    @DisplayName("Case 6: Candidate filtering logic for assignable staff and escalatable owners (Shop A vs Shop B isolation)")
    public void testCase6_CandidateFilteringByBranch() {
        User cskhA = createUser("cskh_filt_a_" + System.currentTimeMillis() + "@ettee.vn", Role.CSKH_STAFF, 1L);
        User cskhB = createUser("cskh_filt_b_" + System.currentTimeMillis() + "@ettee.vn", Role.CSKH_STAFF, 2L);
        User ownerA = createUser("owner_filt_a_" + System.currentTimeMillis() + "@ettee.vn", Role.SHOP_OWNER, 1L);
        User ownerB = createUser("owner_filt_b_" + System.currentTimeMillis() + "@ettee.vn", Role.SHOP_OWNER, 2L);
        User admin = createUser("admin_filt_" + System.currentTimeMillis() + "@ettee.vn", Role.ADMIN, null);

        SupportTicket ticketShopA = ticketRepository.save(SupportTicket.builder()
                .ticketCode("TK-FILT-A-" + System.currentTimeMillis())
                .customerId("cust-filt-1")
                .shopId(1L)
                .subject("Test Candidate Filtering")
                .status("OPEN")
                .build());

        // Test Assignable Staff for Shop A ticket
        java.util.List<UserCandidateDto> assignable = ticketService.getAssignableStaffCandidates(cskhA, ticketShopA.getId());
        assertTrue(assignable.stream().anyMatch(u -> u.getId().equals(cskhA.getId())), "Lỗi: cskhA phải có trong danh sách phân công Shop A");
        assertTrue(assignable.stream().anyMatch(u -> u.getId().equals(admin.getId())), "Lỗi: admin phải có trong danh sách phân công Shop A");
        assertFalse(assignable.stream().anyMatch(u -> u.getId().equals(cskhB.getId())), "Lỗi bảo mật: CSKH Shop B không được xuất hiện trong danh sách Shop A");

        // Test Escalatable Owners for Shop A ticket
        java.util.List<UserCandidateDto> escalatable = ticketService.getEscalatableOwnerCandidates(cskhA, ticketShopA.getId());
        assertTrue(escalatable.stream().anyMatch(u -> u.getId().equals(ownerA.getId())), "Lỗi: ownerA phải có trong danh sách leo thang Shop A");
        assertTrue(escalatable.stream().anyMatch(u -> u.getId().equals(admin.getId())), "Lỗi: admin phải có trong danh sách leo thang Shop A");
        assertFalse(escalatable.stream().anyMatch(u -> u.getId().equals(ownerB.getId())), "Lỗi bảo mật: Owner Shop B không được xuất hiện trong danh sách Shop A");
    }

    @Test
    @Transactional
    @DisplayName("Case 7: Security protection on getAllStaffCandidates (CSKH_STAFF -> 403 Forbidden, ADMIN -> 200 OK)")
    public void testCase7_AllStaffEndpointAdminOnlyProtection() {
        User cskh = createUser("cskh_sec_" + System.currentTimeMillis() + "@ettee.vn", Role.CSKH_STAFF, 1L);
        User admin = createUser("admin_sec_" + System.currentTimeMillis() + "@ettee.vn", Role.ADMIN, null);

        // CSKH_STAFF attempting to fetch all staff -> 403
        ResponseStatusException exForbidden = assertThrows(ResponseStatusException.class, () -> {
            ticketService.getAllStaffCandidates(cskh);
        });
        assertEquals(HttpStatus.FORBIDDEN, exForbidden.getStatusCode());

        // ADMIN fetching all staff -> Allowed
        java.util.List<UserCandidateDto> allStaff = ticketService.getAllStaffCandidates(admin);
        assertNotNull(allStaff);
        assertFalse(allStaff.isEmpty());
    }
}
