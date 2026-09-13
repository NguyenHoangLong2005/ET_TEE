package com.ettee.opscore.identity.repository;

import com.ettee.opscore.identity.entity.UserRole;
import com.ettee.opscore.identity.entity.UserRoleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {

    @Query("select ur from UserRole ur join fetch ur.role where ur.id.userId = :userId")
    List<UserRole> findAllByUserId(@Param("userId") UUID userId);

    void deleteByIdUserIdAndIdRoleId(UUID userId, UUID roleId);

    @Query("""
           select p.code from UserRole ur
           join ur.role r
           join r.permissions p
           where ur.id.userId = :userId
           """)
    List<String> findPermissionCodesByUserId(@Param("userId") UUID userId);

    @Query("select r.code from UserRole ur join ur.role r where ur.id.userId = :userId")
    List<String> findRoleCodesByUserId(@Param("userId") UUID userId);
}
