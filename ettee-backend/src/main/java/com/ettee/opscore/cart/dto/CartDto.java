package com.ettee.opscore.cart.dto;

import java.util.List;
import java.util.UUID;

public record CartDto(UUID id, long version, List<CartItemDto> items) {
}