package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.Manufacturer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ManufacturerRepository extends JpaRepository<Manufacturer, Long> {

    @Query("SELECT m FROM Manufacturer m WHERE :keyword IS NULL OR LOWER(m.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(m.country) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Manufacturer> searchManufacturers(@Param("keyword") String keyword, Pageable pageable);
}
