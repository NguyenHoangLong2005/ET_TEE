package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.Banner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BannerRepository extends JpaRepository<Banner, Long> {

    /** Public banner query: ACTIVE within window, ordered priority DESC then displayOrder ASC. */
    @Query("SELECT b FROM Banner b " +
           "WHERE (b.status IS NULL OR b.status = 'ACTIVE') " +
           "AND (b.startDate IS NULL OR b.startDate <= :now) " +
           "AND (b.endDate IS NULL OR b.endDate >= :now) " +
           "ORDER BY b.priority DESC, b.displayOrder ASC, b.id ASC")
    List<Banner> findAllActive(@Param("now") LocalDateTime now);

    @Query("SELECT b FROM Banner b " +
           "WHERE b.position = :position " +
           "AND (b.status IS NULL OR b.status = 'ACTIVE') " +
           "AND (b.startDate IS NULL OR b.startDate <= :now) " +
           "AND (b.endDate IS NULL OR b.endDate >= :now) " +
           "ORDER BY b.priority DESC, b.displayOrder ASC, b.id ASC")
    List<Banner> findActiveByPosition(@Param("position") String position, @Param("now") LocalDateTime now);
}
