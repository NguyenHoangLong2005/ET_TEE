package com.ettee.opscore.systemops.dto;

import java.time.Instant;
import java.util.UUID;

public record AuditLogDto(Long id, UUID actorUserId, String action, String entityType,
                           UUID entityId, String oldValue, String newValue, Instant createdAt) {
}
