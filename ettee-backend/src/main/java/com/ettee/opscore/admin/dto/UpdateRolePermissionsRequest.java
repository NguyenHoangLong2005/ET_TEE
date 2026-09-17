package com.ettee.opscore.admin.dto;

import java.util.List;

public record UpdateRolePermissionsRequest(List<String> permissionCodes) {
}
