package com.ettee.opscore.cskh.ticket.repository;

import com.ettee.opscore.cskh.ticket.entity.StaffSupportLimit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface StaffSupportLimitRepository extends JpaRepository<StaffSupportLimit, UUID> {
}
