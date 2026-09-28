package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.RoleEntity;
import com.nguyenhoanglong.repository.RoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class RoleService {
    private final RoleRepository roleRepository;

    public RoleService(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    public List<RoleEntity> getAllRoles() {
        return roleRepository.findAll();
    }

    public Optional<RoleEntity> getRoleByCode(String code) {
        return roleRepository.findById(code);
    }

    @Transactional
    public RoleEntity createRole(RoleEntity role) {
        return roleRepository.save(role);
    }

    @Transactional
    public void deleteRole(String code) {
        roleRepository.deleteById(code);
    }
}
