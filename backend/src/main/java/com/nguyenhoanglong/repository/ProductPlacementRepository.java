package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.ProductPlacement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ProductPlacementRepository extends JpaRepository<ProductPlacement, Long> {

    @Query("SELECT pp FROM ProductPlacement pp " +
           "WHERE pp.placementKey = :key AND pp.status = 'ACTIVE' " +
           "AND (pp.startDate IS NULL OR pp.startDate <= :now) " +
           "AND (pp.endDate IS NULL OR pp.endDate >= :now) " +
           "ORDER BY pp.position ASC")
    List<ProductPlacement> findActiveByKey(@Param("key") String key, @Param("now") LocalDateTime now);

    List<ProductPlacement> findByPlacementKeyOrderByPositionAsc(String placementKey);

    /**
     * Raw insert to bypass JPA persistence quirks with this entity.
     * Avoids the JDBC type inference issue when binding LocalDateTime defaults.
     */
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(
        value = "INSERT INTO product_placements " +
                "(placement_key, product_id, position, status, start_date, end_date, " +
                " created_by, updated_by, created_at, updated_at) " +
                "VALUES (:key, :productId, :position, :status, " +
                " COALESCE(:startDate, NULL), COALESCE(:endDate, NULL), " +
                " :createdBy, :updatedBy, :now, :now)",
        nativeQuery = true)
    int insertPlacement(@Param("key") String key,
                        @Param("productId") Long productId,
                        @Param("position") Integer position,
                        @Param("status") String status,
                        @Param("startDate") LocalDateTime startDate,
                        @Param("endDate") LocalDateTime endDate,
                        @Param("createdBy") String createdBy,
                        @Param("updatedBy") String updatedBy,
                        @Param("now") LocalDateTime now);
}
