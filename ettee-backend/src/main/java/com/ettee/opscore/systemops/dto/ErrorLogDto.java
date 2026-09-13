package com.ettee.opscore.systemops.dto;

import java.time.Instant;

public record ErrorLogDto(Long id, String serviceName, String severity, String message,
                           boolean resolved, Instant occurredAt) {
}
