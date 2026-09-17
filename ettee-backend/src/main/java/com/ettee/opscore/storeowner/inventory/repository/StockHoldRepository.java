package com.ettee.opscore.storeowner.inventory.repository;

import com.ettee.opscore.storeowner.inventory.entity.StockHold;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface StockHoldRepository extends JpaRepository<StockHold, UUID> {
}