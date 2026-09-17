package com.ettee.opscore.storeowner.inventory.repository;

import com.ettee.opscore.storeowner.inventory.entity.StockLocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface StockLocationRepository extends JpaRepository<StockLocation, UUID> {
}
