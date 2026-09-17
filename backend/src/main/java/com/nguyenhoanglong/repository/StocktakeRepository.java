package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.Stocktake;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StocktakeRepository
        extends JpaRepository<Stocktake, Long> {

    List<Stocktake> findByWarehouseLocation(
            String warehouseLocation
    );

    List<Stocktake> findByStatus(String status);

    List<Stocktake> findByWarehouseLocationAndStatus(
            String warehouseLocation,
            String status
    );
}