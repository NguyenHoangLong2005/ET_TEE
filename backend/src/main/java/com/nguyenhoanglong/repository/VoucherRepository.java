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

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM Voucher v WHERE v.code = :code")
    Optional<Voucher> findByCodeWithLock(@Param("code") String code);

    @Query("SELECT v FROM Voucher v " +
           "WHERE (v.status IS NULL OR v.status = 'ACTIVE') " +
           "AND (v.grantedToCustomerId IS NULL) " +
           "AND (v.startDate IS NULL OR v.startDate <= :now) " +
           "AND (v.endDate IS NULL OR v.endDate >= :now)")
    List<Voucher> findAllActive(@Param("now") java.time.LocalDateTime now);

    // Loc o tang DB cho man hinh duyet cua chu shop (truoc day dung findAll() roi filter).
    // shopId NULL: created by marketing staff with no shop, which any store owner may approve.
    @Query("SELECT v FROM Voucher v WHERE (v.shopId = :shopId OR v.shopId IS NULL) "
            + "AND UPPER(COALESCE(v.status, '')) IN ('PENDING', 'PENDING_APPROVAL')")
    List<Voucher> findPendingApprovalByShopId(@Param("shopId") Long shopId);

    List<Voucher> findByShopId(Long shopId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Voucher v SET v.usedCount = COALESCE(v.usedCount, 0) + 1, v.updatedAt = :now " +
           "WHERE v.id = :id AND (v.maxUses IS NULL OR COALESCE(v.usedCount, 0) < v.maxUses)")
    int incrementUsedCountAtomic(@Param("id") Long id, @Param("now") java.time.LocalDateTime now);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Voucher v SET v.usedCount = CASE WHEN COALESCE(v.usedCount, 0) > 0 THEN COALESCE(v.usedCount, 0) - 1 ELSE 0 END, " +
           "v.updatedAt = :now WHERE v.id = :id")
    int decrementUsedCountAtomic(@Param("id") Long id, @Param("now") java.time.LocalDateTime now);

    boolean existsByCode(String code);

    long countByStatus(String status);
}
