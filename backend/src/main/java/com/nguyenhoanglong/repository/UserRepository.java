package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    
    @Query("SELECT u FROM User u WHERE LOWER(u.email) = LOWER(:email)")
    Optional<User> findByEmail(String email);

    @Query("SELECT u.status FROM User u WHERE LOWER(u.email) = LOWER(:email)")
    Optional<String> findStatusByEmail(String email);

    /** status, role, passwordChangedAt, mustChangePassword: what the JWT filter must read fresh on every request. */
    @Query("SELECT u.status, u.role, u.passwordChangedAt, u.mustChangePassword FROM User u WHERE LOWER(u.email) = LOWER(:email)")
    List<Object[]> findAuthStateByEmail(@Param("email") String email);
    
    @Query("SELECT COUNT(u) > 0 FROM User u WHERE LOWER(u.email) = LOWER(:email)")
    boolean existsByEmail(String email);
    
    boolean existsByEmployeeCode(String employeeCode);

    @Query("SELECT u FROM User u WHERE LOWER(u.employeeCode) = LOWER(:employeeCode)")
    Optional<User> findByEmployeeCodeIgnoreCase(String employeeCode);

    boolean existsByEmployeeCodeAndIdNot(String employeeCode, String id);

    long countByRoleAndStatus(com.nguyenhoanglong.entity.Role role, String status);

    List<User> findByRoleAndStatus(com.nguyenhoanglong.entity.Role role, String status);

    @Query("SELECT u FROM User u WHERE " +
           "(:keyword IS NULL OR LOWER(u.email) LIKE CAST(:keyword AS text) OR LOWER(u.fullName) LIKE CAST(:keyword AS text) OR LOWER(u.employeeCode) LIKE CAST(:keyword AS text)) " +
           "AND (:role IS NULL OR u.role = :role) " +
           "AND (:status IS NULL OR u.status = :status)")
    org.springframework.data.domain.Page<User> searchUsers(
            @org.springframework.data.repository.query.Param("keyword") String keyword,
            @org.springframework.data.repository.query.Param("role") com.nguyenhoanglong.entity.Role role,
            @org.springframework.data.repository.query.Param("status") String status,
            org.springframework.data.domain.Pageable pageable);

    @Modifying
    @Transactional
    @Query(value = "UPDATE users SET failed_login_attempts = failed_login_attempts + 1, " +
                   "locked_until = CASE WHEN failed_login_attempts + 1 >= 5 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes' ELSE locked_until END " +
                   "WHERE id = :userId", nativeQuery = true)
    void incrementFailedLoginAttempts(String userId);

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.failedLoginAttempts = 0, u.lockedUntil = null WHERE u.id = :userId")
    void resetFailedLoginAttempts(String userId);

    @Query("SELECT u FROM User u WHERE u.status = 'ACTIVE' AND ((u.role = com.nguyenhoanglong.entity.Role.CSKH_STAFF AND (:shopId IS NULL OR u.shopId = :shopId)) OR u.role = com.nguyenhoanglong.entity.Role.ADMIN)")
    List<User> findAssignableStaffForShop(@org.springframework.data.repository.query.Param("shopId") Long shopId);

    @Query("SELECT u FROM User u WHERE u.status = 'ACTIVE' AND ((u.role = com.nguyenhoanglong.entity.Role.SHOP_OWNER AND (:shopId IS NULL OR u.shopId = :shopId)) OR u.role = com.nguyenhoanglong.entity.Role.ADMIN)")
    List<User> findEscalatableOwnersForShop(@org.springframework.data.repository.query.Param("shopId") Long shopId);

    @Query("SELECT u FROM User u WHERE u.status = 'ACTIVE' AND u.role IN (com.nguyenhoanglong.entity.Role.CSKH_STAFF, com.nguyenhoanglong.entity.Role.SHOP_OWNER, com.nguyenhoanglong.entity.Role.ADMIN)")
    List<User> findAllStaffAndOwners();

    @Query("SELECT COUNT(u) FROM User u WHERE u.shopId IS NULL AND u.role IN :roles")
    long countByShopIdIsNullAndRoleIn(@org.springframework.data.repository.query.Param("roles") List<com.nguyenhoanglong.entity.Role> roles);

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.shopId = 1 WHERE u.shopId IS NULL AND u.role IN :roles")
    void fixStaffShopId(@org.springframework.data.repository.query.Param("roles") List<com.nguyenhoanglong.entity.Role> roles);
    
    List<User> findByShopId(Long shopId);

    long countByShopId(Long shopId);

    long countByShopIdAndStatus(Long shopId, String status);

    // Thong ke cho the tong quan dashboard: COUNT(*) thay vi tai 100 user ve client de dem.
    @org.springframework.data.jpa.repository.Query(
            "SELECT COALESCE(UPPER(u.status), 'ACTIVE') AS status, COUNT(u) FROM User u GROUP BY UPPER(u.status)")
    List<Object[]> countGroupedByStatus();
}
