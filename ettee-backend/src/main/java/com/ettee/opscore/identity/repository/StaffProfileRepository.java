package com.ettee.opscore.identity.repository;

import com.ettee.opscore.identity.entity.StaffProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface StaffProfileRepository extends JpaRepository<StaffProfile, UUID> {
}
