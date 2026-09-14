package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.Voucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface VoucherRepository extends JpaRepository<Voucher, Long> {

    Optional<Voucher> findByCode(String code);

    @Query("SELECT v FROM Voucher v " +
           "WHERE (v.status IS NULL OR v.status = 'ACTIVE') " +
           "AND (v.startDate IS NULL OR v.startDate <= :now) " +
           "AND (v.endDate IS NULL OR v.endDate >= :now)")
    List<Voucher> findAllActive(@Param("now") java.time.LocalDateTime now);

    boolean existsByCode(String code);
}
