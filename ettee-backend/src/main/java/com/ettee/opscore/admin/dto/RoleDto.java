package com.ettee.opscore.admin.dto;

import java.util.List;
import java.util.UUID;

public record RoleDto(UUID id, String code, String name, String description, boolean staffRole, List<String> permissionCodes) {
}
