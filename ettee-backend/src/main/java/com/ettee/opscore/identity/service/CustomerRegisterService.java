package com.ettee.opscore.identity.service;

import com.ettee.opscore.common.exception.AppExceptions;
import com.ettee.opscore.identity.entity.AccountStatus;
import com.ettee.opscore.identity.entity.AppUser;
import com.ettee.opscore.identity.entity.Role;
import com.ettee.opscore.identity.entity.UserRole;
import com.ettee.opscore.identity.repository.RoleRepository;
import com.ettee.opscore.identity.repository.UserRepository;
import com.ettee.opscore.identity.repository.UserRoleRepository;
import com.ettee.opscore.order.entity.Customer;
import com.ettee.opscore.order.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerRegisterService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void registerCustomer(com.ettee.opscore.identity.dto.RegisterRequest request) {
        if (request.email() == null && request.phone() == null) {
            throw new AppExceptions.BusinessRuleViolationException("Phải có email hoặc số điện thoại");
        }

        String normalizedEmail = request.email() != null ? request.email().trim() : null;
        String normalizedPhone = request.phone() != null ? request.phone().trim() : null;

        if (normalizedEmail != null && userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new AppExceptions.BusinessRuleViolationException("Email đã được sử dụng");
        }

        if (normalizedPhone != null && userRepository.findByPhone(normalizedPhone).isPresent()) {
            throw new AppExceptions.BusinessRuleViolationException("Số điện thoại đã được sử dụng");
        }

        AppUser user = new AppUser();
        user.setFullName(request.fullName().trim());
        user.setEmail(normalizedEmail);
        user.setPhone(normalizedPhone);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setStatus(AccountStatus.active);
        user.setStaff(false);
        user = userRepository.save(user);

        Role customerRole = roleRepository.findByCode("customer")
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Role", "customer"));
        userRoleRepository.save(UserRole.of(user.getId(), customerRole.getId(), user.getId()));

        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setUserId(user.getId());
        customer.setFullName(request.fullName().trim());
        customer.setEmail(normalizedEmail);
        customer.setPhone(normalizedPhone);
        customer.setCreatedAt(Instant.now());
        customerRepository.save(customer);
    }
}
