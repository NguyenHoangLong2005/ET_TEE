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

    /**
     * keyword must NOT be null: on PostgreSQL a null bind parameter inside
     * LOWER(CONCAT(...)) fails type inference ("function lower(bytea) does not
     * exist") and the whole list endpoint answers 500. Pass "" for "no filter".
     */
    @Query("SELECT m FROM Manufacturer m WHERE :keyword = '' "
            + "OR LOWER(m.name) LIKE LOWER(CONCAT('%', :keyword, '%')) "
            + "OR LOWER(m.country) LIKE LOWER(CONCAT('%', :keyword, '%')) "
            + "OR LOWER(m.contactEmail) LIKE LOWER(CONCAT('%', :keyword, '%')) "
            + "OR LOWER(m.website) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Manufacturer> searchManufacturers(@Param("keyword") String keyword, Pageable pageable);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
