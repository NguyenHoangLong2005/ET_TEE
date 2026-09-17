package com.ettee.opscore.admin.dto;

import java.util.UUID;

public record PermissionDto(UUID id, String code, String description) {
}
