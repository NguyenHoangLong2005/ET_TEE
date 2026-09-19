package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.Stocktake;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StocktakeRepository extends JpaRepository<Stocktake, UUID> {

    List<Stocktake> findByWarehouseLocation(String warehouseLocation);

    List<Stocktake> findByStatus(String status);

    List<Stocktake> findByWarehouseLocationAndStatus(String warehouseLocation, String status);
}
