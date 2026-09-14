package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.*;
import com.nguyenhoanglong.entity.User;
import com.nguyenhoanglong.entity.UserMeasurement;
import com.nguyenhoanglong.repository.UserMeasurementRepository;
import com.nguyenhoanglong.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final UserRepository userRepository;
    private final UserMeasurementRepository measurementRepository;
    private final PasswordEncoder passwordEncoder;

    public AccountService(UserRepository userRepository, UserMeasurementRepository measurementRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.measurementRepository = measurementRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public ProfileResponse getProfile(User user) {
        ProfileResponse response = new ProfileResponse();
        response.setId(user.getId());
        response.setFullName(user.getFullName());
        response.setEmail(user.getEmail());
        response.setPhone(user.getPhone());
        response.setGender(user.getGender());
        response.setDateOfBirth(user.getDateOfBirth());
        response.setAvatarUrl(user.getAvatarUrl());
        response.setDefaultShippingAddress(user.getDefaultShippingAddress());
        response.setCreatedAt(user.getCreatedAt());
        return response;
    }

    @Transactional
    public ProfileResponse updateProfile(User user, ProfileRequest request) {
        if (request.getFullName() != null && !request.getFullName().trim().isEmpty()) {
            user.setFullName(request.getFullName().trim());
        }
        user.setPhone(request.getPhone());
        user.setGender(request.getGender());
        user.setDateOfBirth(request.getDateOfBirth());
        user.setAvatarUrl(request.getAvatarUrl());
        user.setDefaultShippingAddress(request.getDefaultShippingAddress());

        userRepository.save(user);
        return getProfile(user);
    }

    public MeasurementRequest getMeasurements(User user) {
        UserMeasurement measurement = measurementRepository.findByUserId(user.getId()).orElse(null);
        MeasurementRequest response = new MeasurementRequest();
        if (measurement != null) {
            response.setMeasurementProfileType(measurement.getMeasurementProfileType());
            response.setHeightCm(measurement.getHeightCm());
            response.setWeightKg(measurement.getWeightKg());
            response.setShoulderCm(measurement.getShoulderCm());
            response.setChestCm(measurement.getChestCm());
            response.setWaistCm(measurement.getWaistCm());
            response.setHipCm(measurement.getHipCm());
            response.setArmLengthCm(measurement.getArmLengthCm());
            response.setLegLengthCm(measurement.getLegLengthCm());
            response.setPreferredAdultSize(measurement.getPreferredAdultSize());
            response.setPreferredKidsSize(measurement.getPreferredKidsSize());
            response.setShoeSize(measurement.getShoeSize());
            response.setFitPreference(measurement.getFitPreference());
            response.setNote(measurement.getNote());
        } else {
            response.setMeasurementProfileType("SELF_ADULT");
        }
        return response;
    }

    @Transactional
    public MeasurementRequest updateMeasurements(User user, MeasurementRequest request) {
        // Validation for size preferences
        String type = request.getMeasurementProfileType();
        if (type == null) type = "SELF_ADULT";

        if ("SELF_ADULT".equals(type) && request.getPreferredKidsSize() != null && !request.getPreferredKidsSize().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Profile người lớn không được nhập size trẻ em.");
        }
        if ("CHILD".equals(type) && request.getPreferredAdultSize() != null && !request.getPreferredAdultSize().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Profile trẻ em không được nhập size người lớn.");
        }
        if (request.getPreferredAdultSize() != null && !request.getPreferredAdultSize().trim().isEmpty() &&
            request.getPreferredKidsSize() != null && !request.getPreferredKidsSize().trim().isEmpty() &&
            !"OTHER".equals(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần chọn loại hồ sơ (OTHER) để nhập cả 2 loại size.");
        }

        // Height and Weight Validation
        if (request.getHeightCm() != null && (request.getHeightCm() < 80 || request.getHeightCm() > 230)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chiều cao không hợp lý (80-230cm).");
        }
        if (request.getWeightKg() != null && (request.getWeightKg() < 10 || request.getWeightKg() > 200)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cân nặng không hợp lý (10-200kg).");
        }
        
        // Negative checks
        if (request.getShoulderCm() != null && request.getShoulderCm() < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số đo không hợp lý");
        if (request.getChestCm() != null && request.getChestCm() < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số đo không hợp lý");
        if (request.getWaistCm() != null && request.getWaistCm() < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số đo không hợp lý");
        if (request.getHipCm() != null && request.getHipCm() < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số đo không hợp lý");

        UserMeasurement measurement = measurementRepository.findByUserId(user.getId())
                .orElse(new UserMeasurement());
        measurement.setUser(user);
        measurement.setMeasurementProfileType(type);
        measurement.setHeightCm(request.getHeightCm());
        measurement.setWeightKg(request.getWeightKg());
        measurement.setShoulderCm(request.getShoulderCm());
        measurement.setChestCm(request.getChestCm());
        measurement.setWaistCm(request.getWaistCm());
        measurement.setHipCm(request.getHipCm());
        measurement.setArmLengthCm(request.getArmLengthCm());
        measurement.setLegLengthCm(request.getLegLengthCm());
        measurement.setPreferredAdultSize(request.getPreferredAdultSize());
        measurement.setPreferredKidsSize(request.getPreferredKidsSize());
        measurement.setShoeSize(request.getShoeSize());
        measurement.setFitPreference(request.getFitPreference());
        measurement.setNote(request.getNote());

        measurementRepository.save(measurement);
        
        return request;
    }

    @Transactional
    public void changePassword(User user, ChangePasswordRequest request) {
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu hiện tại không đúng.");
        }
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Xác nhận mật khẩu không khớp.");
        }
        if (request.getNewPassword().length() < 8 || !request.getNewPassword().matches(".*[a-zA-Z].*") || !request.getNewPassword().matches(".*[0-9].*")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu mới phải từ 8 ký tự, có chữ và số.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}
