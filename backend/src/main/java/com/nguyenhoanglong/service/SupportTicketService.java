package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.entity.User;

public interface SupportTicketService {

    // Staff Portal APIs
    PaginatedResponseDto<SupportTicketDto> getStaffTickets(User actor, int page, int size, String status, Integer priority, String assignedTo, String search);

    SupportTicketDetailDto getStaffTicketById(User actor, String id);

    SupportTicketDetailDto createStaffTicket(User actor, CreateTicketDto dto);

    SupportTicketDto updateTicketStatus(User actor, String id, UpdateTicketStatusDto dto);

    TicketMessageDto addStaffMessage(User actor, String id, AddTicketMessageDto dto);

    SupportTicketDto assignTicket(User actor, String id, AssignTicketDto dto);

    java.util.List<UserCandidateDto> getAssignableStaffCandidates(User actor, String ticketId);

    java.util.List<UserCandidateDto> getEscalatableOwnerCandidates(User actor, String ticketId);

    java.util.List<UserCandidateDto> getAllStaffCandidates(User actor);

    SupportTicketDetailDto linkOrderToTicket(User actor, String ticketId, LinkOrderTicketDto dto);

    // Customer Storefront APIs
    SupportTicketDetailDto createCustomerTicket(User customer, CreateTicketDto dto);

    PaginatedResponseDto<SupportTicketDto> getCustomerTickets(User customer, int page, int size);

    SupportTicketDetailDto getCustomerTicketById(User customer, String id);

    TicketMessageDto addCustomerMessage(User customer, String id, AddTicketMessageDto dto);
}
