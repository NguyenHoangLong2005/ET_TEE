package com.ettee.opscore.cskh.ticket.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ticket_messages", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class TicketMessage {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "ticket_id", nullable = false, columnDefinition = "uuid")
    private UUID ticketId;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "sender_type", nullable = false, columnDefinition = "sender_type")
    private SenderType senderType;

    @Column(name = "sender_id", columnDefinition = "uuid")
    private UUID senderId;

    @Column(nullable = false, columnDefinition = "text")
    private String message;

    @Column(name = "attachment_url", columnDefinition = "text")
    private String attachmentUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
