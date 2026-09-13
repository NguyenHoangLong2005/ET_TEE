package com.ettee.opscore.identity.repository;

import com.ettee.opscore.identity.entity.AppUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<AppUser, UUID> {

       Optional<AppUser> findByEmail(String email);

       Optional<AppUser> findByPhone(String phone);

       @Query(value = """
                     select u.*
                     from ettee.users u
                     where (:keyword is null or u.full_name ilike '%' || cast(:keyword as text) || '%'
                            or u.email ilike '%' || cast(:keyword as text) || '%'
                            or u.phone like '%' || cast(:keyword as text) || '%')
                       and (:isStaff is null or u.is_staff = :isStaff)
                     order by u.created_at desc
                     """, countQuery = """
                     select count(*)
                     from ettee.users u
                     where (:keyword is null or u.full_name ilike '%' || cast(:keyword as text) || '%'
                            or u.email ilike '%' || cast(:keyword as text) || '%'
                            or u.phone like '%' || cast(:keyword as text) || '%')
                       and (:isStaff is null or u.is_staff = :isStaff)
                     """, nativeQuery = true)
       Page<AppUser> search(@Param("keyword") String keyword, @Param("isStaff") Boolean isStaff, Pageable pageable);
}
