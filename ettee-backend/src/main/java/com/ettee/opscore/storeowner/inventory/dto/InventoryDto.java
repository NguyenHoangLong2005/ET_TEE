package com.ettee.opscore.storeowner.inventory.dto;

import java.util.UUID;

public record InventoryDto(
        UUID variantId, UUID locationId, int quantityOnHand, int quantityReserved,
        int available, int reorderLevel
) {
}
