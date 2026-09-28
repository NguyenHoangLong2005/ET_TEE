package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.StaffAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StaffAuditLogRepository extends JpaRepository<StaffAuditLog, Long> {
    List<StaffAuditLog> findByStaffIdOrderByCreatedAtDesc(String staffId);
    
    @Query("SELECT sal FROM StaffAuditLog sal WHERE sal.staff.shopId = :shopId ORDER BY sal.createdAt DESC")
    List<StaffAuditLog> findByShopIdOrderByCreatedAtDesc(@Param("shopId") Long shopId);
}
