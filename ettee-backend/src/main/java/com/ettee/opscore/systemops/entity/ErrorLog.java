package com.ettee.opscore.systemops.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "error_logs", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class ErrorLog {

    @Id
    private Long id;

    @Column(name = "service_name", nullable = false, length = 100)
    private String serviceName;

    @Column(nullable = false, length = 20)
    private String severity;

    @Column(nullable = false, columnDefinition = "text")
    private String message;

    @Column(name = "stack_trace", columnDefinition = "text")
    private String stackTrace;

    @Column(nullable = false)
    private boolean resolved = false;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;
}
