package com.ettee.opscore.cskh.ticket.service;

import com.ettee.opscore.cskh.ticket.dto.*;
import com.ettee.opscore.cskh.ticket.entity.*;
import com.ettee.opscore.cskh.ticket.repository.SupportTicketRepository;
import com.ettee.opscore.cskh.ticket.repository.TicketMessageRepository;
import com.ettee.opscore.common.dto.PageResponse;
import com.ettee.opscore.common.exception.AppExceptions;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final SupportTicketRepository ticketRepository;
    private final TicketMessageRepository messageRepository;

    @Transactional(readOnly = true)
    public PageResponse<TicketDto> search(TicketStatus status, UUID assignedTo, Pageable pageable) {
        return PageResponse.from(ticketRepository.search(status, assignedTo, pageable).map(this::toDto));
    }

    @Transactional(readOnly = true)
    public TicketDto getById(UUID id) {
        return toDto(findOrThrow(id));
    }

    @Transactional(readOnly = true)
    public List<TicketMessageDto> getMessages(UUID ticketId) {
        return messageRepository.findAllByTicketIdOrderByCreatedAtAsc(ticketId).stream().map(this::toDto).toList();
    }

    /** Nhân viên CSKH trả lời khách -> senderType = staff. Tự chuyển ticket sang in_progress nếu đang open. */
    @Transactional
    public TicketMessageDto reply(UUID ticketId, CreateTicketMessageRequest request, UUID staffId) {
        SupportTicket ticket = findOrThrow(ticketId);

        TicketMessage msg = new TicketMessage();
        msg.setTicketId(ticketId);
        msg.setSenderType(SenderType.staff);
        msg.setSenderId(staffId);
        msg.setMessage(request.message());
        msg.setAttachmentUrl(request.attachmentUrl());
        TicketMessage saved = messageRepository.save(msg);

        if (ticket.getStatus() == TicketStatus.open) {
            ticket.setStatus(TicketStatus.in_progress);
            ticket.setAssignedTo(staffId);
            ticketRepository.save(ticket);
        }
        return toDto(saved);
    }

    @Transactional
    public TicketDto assign(UUID ticketId, UUID staffUserId) {
        SupportTicket ticket = findOrThrow(ticketId);
        ticket.setAssignedTo(staffUserId);
        if (ticket.getStatus() == TicketStatus.open) ticket.setStatus(TicketStatus.in_progress);
        return toDto(ticketRepository.save(ticket));
    }

    /** "Chuyển khiếu nại lên cấp quản lý". */
    @Transactional
    public TicketDto escalate(UUID ticketId, EscalateTicketRequest request, UUID actorId) {
        SupportTicket ticket = findOrThrow(ticketId);
        ticket.setEscalatedTo(request.escalateToUserId());
        ticket.setStatus(TicketStatus.escalated);
        ticketRepository.save(ticket);

        if (request.note() != null && !request.note().isBlank()) {
            TicketMessage sysMsg = new TicketMessage();
            sysMsg.setTicketId(ticketId);
            sysMsg.setSenderType(SenderType.system);
            sysMsg.setSenderId(actorId);
            sysMsg.setMessage("[Escalate] " + request.note());
            messageRepository.save(sysMsg);
        }
        return toDto(ticket);
    }

    @Transactional
    public TicketDto updateStatus(UUID ticketId, TicketStatus status) {
        SupportTicket ticket = findOrThrow(ticketId);
        ticket.setStatus(status);
        if (status == TicketStatus.resolved || status == TicketStatus.closed) {
            ticket.setResolvedAt(Instant.now());
        }
        return toDto(ticketRepository.save(ticket));
    }

    private SupportTicket findOrThrow(UUID id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Ticket", id));
    }

    private TicketDto toDto(SupportTicket t) {
        return new TicketDto(t.getId(), t.getCustomerId(), t.getOrderId(), t.getChannel(), t.getSubject(),
                t.getStatus(), t.getPriority(), t.getAssignedTo(), t.getEscalatedTo(), t.getCreatedAt(), t.getResolvedAt());
    }

    private TicketMessageDto toDto(TicketMessage m) {
        return new TicketMessageDto(m.getId(), m.getTicketId(), m.getSenderType(), m.getSenderId(),
                m.getMessage(), m.getAttachmentUrl(), m.getCreatedAt());
    }
}
